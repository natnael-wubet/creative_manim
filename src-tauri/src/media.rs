//! A loopback HTTP server that streams rendered videos to the webview.
//!
//! `convertFileSrc` hands the webview an `asset://` URL, and WebKitGTK routes
//! media through GStreamer, which has no handler for that scheme. Video over
//! `asset://` therefore never plays on Linux (tauri#3725, WebKit bug 146351).
//! Serving the same bytes over `http://127.0.0.1` works, so every preview goes
//! through this server instead.

use std::collections::hash_map::RandomState;
use std::fs::{self, File};
use std::hash::{BuildHasher, Hasher};
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom, Write};
use std::net::{Ipv4Addr, SocketAddrV4, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, Weak};
use std::thread;
use std::time::Duration;

/// How many distinct files stay playable. One entry per render is enough, and a
/// bound keeps a long session from growing the map without limit.
const MAX_FILES: usize = 32;

/// Upper bound on simultaneously served connections, so a stray local process
/// cannot spawn threads without limit.
const MAX_CONNECTIONS: usize = 64;

/// Applied to the first request line and to any keep-alive reuse. A client that
/// goes away mid-body hits the write timeout instead.
const IDLE_TIMEOUT: Duration = Duration::from_secs(10);

const CHUNK: usize = 64 * 1024;

const CONTENT_TYPES: &[(&str, &str)] = &[
    ("mp4", "video/mp4"),
    ("m4v", "video/mp4"),
    ("mov", "video/quicktime"),
    ("webm", "video/webm"),
    ("mkv", "video/x-matroska"),
    ("gif", "image/gif"),
];

fn content_type_for(path: &Path) -> Option<&'static str> {
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    CONTENT_TYPES
        .iter()
        .find(|(candidate, _)| *candidate == ext)
        .map(|(_, mime)| *mime)
}

fn encode_component(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    for byte in raw.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

struct Running {
    port: u16,
}

/// Owns the listener, the allowlist of files it will hand out, and the counter
/// used to keep connections bounded.
#[derive(Default)]
pub struct MediaServer {
    /// Insertion-ordered `(token, path)` pairs, so eviction is a pop from the
    /// front once `MAX_FILES` is exceeded.
    files: Mutex<Vec<(String, PathBuf)>>,
    sequence: AtomicU64,
    open_connections: AtomicUsize,
    running: Mutex<Option<Running>>,
}

impl MediaServer {
    /// Registers `path` and returns a loopback URL that plays it. Re-registering
    /// the same file mints a fresh token, so a re-render never serves a stale
    /// frame to a URL the webview is still holding.
    pub fn url_for(self: &Arc<Self>, path: &Path) -> Result<String, String> {
        let port = self.ensure_started()?;
        let token = self.register(path);

        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "video".to_string());

        Ok(format!(
            "http://127.0.0.1:{port}/media/{token}/{}",
            encode_component(&name)
        ))
    }

    fn ensure_started(self: &Arc<Self>) -> Result<u16, String> {
        let mut running = self
            .running
            .lock()
            .map_err(|_| "media server state is poisoned".to_string())?;

        if let Some(active) = running.as_ref() {
            return Ok(active.port);
        }

        let listener = TcpListener::bind(SocketAddrV4::new(Ipv4Addr::LOCALHOST, 0))
            .map_err(|e| format!("could not bind the media server: {e}"))?;
        let port = listener
            .local_addr()
            .map_err(|e| format!("could not read the media server address: {e}"))?
            .port();

        let weak = Arc::downgrade(self);
        thread::spawn(move || accept_loop(listener, weak));
        *running = Some(Running { port });
        eprintln!("[media] serving rendered video on http://127.0.0.1:{port}");

        Ok(port)
    }

    fn register(&self, path: &Path) -> String {
        let seq = self.sequence.fetch_add(1, Ordering::Relaxed);
        // Two independently seeded hashes give 128 bits of per-token entropy
        // without pulling in a uuid crate.
        let mut first = RandomState::new().build_hasher();
        first.write_u64(seq);
        let mut second = RandomState::new().build_hasher();
        second.write_u64(seq.wrapping_mul(0x9e37_79b9_7f4a_7c15));
        let token = format!("{:016x}{:016x}", first.finish(), second.finish());

        if let Ok(mut files) = self.files.lock() {
            files.retain(|(_, existing)| existing != path);
            files.push((token.clone(), path.to_path_buf()));
            let excess = files.len().saturating_sub(MAX_FILES);
            if excess > 0 {
                files.drain(0..excess);
            }
        }

        token
    }

    fn resolve(&self, token: &str) -> Option<PathBuf> {
        let files = self.files.lock().ok()?;
        files
            .iter()
            .find(|(candidate, _)| candidate == token)
            .map(|(_, path)| path.clone())
    }

    fn enter(&self) -> bool {
        let mut open = self.open_connections.load(Ordering::Relaxed);
        loop {
            if open >= MAX_CONNECTIONS {
                return false;
            }
            match self.open_connections.compare_exchange_weak(
                open,
                open + 1,
                Ordering::Relaxed,
                Ordering::Relaxed,
            ) {
                Ok(_) => return true,
                Err(actual) => open = actual,
            }
        }
    }

    fn leave(&self) {
        self.open_connections.fetch_sub(1, Ordering::Relaxed);
    }
}

fn accept_loop(listener: TcpListener, server: Weak<MediaServer>) {
    for incoming in listener.incoming() {
        let Some(server) = server.upgrade() else { break };
        let Ok(stream) = incoming else { continue };

        if !server.enter() {
            eprintln!("[media] refused a connection, {MAX_CONNECTIONS} already open");
            continue;
        }

        let server = Arc::clone(&server);
        thread::spawn(move || {
            serve(stream, &server);
            server.leave();
        });
    }
}

/// Handles one request, then lets the connection close. Keeping sockets open
/// buys nothing for a loopback range stream and every idle one holds a thread.
fn serve(mut stream: TcpStream, server: &MediaServer) {
    let _ = stream.set_nodelay(true);
    let _ = stream.set_read_timeout(Some(IDLE_TIMEOUT));
    let _ = stream.set_write_timeout(Some(IDLE_TIMEOUT));

    let Ok(read_half) = stream.try_clone() else {
        return;
    };
    let mut reader = BufReader::new(read_half);

    let mut request_line = String::new();
    match reader.read_line(&mut request_line) {
        // Idle probe, or a client that vanished before speaking.
        Ok(0) | Err(_) => return,
        Ok(_) => {}
    }

    let mut fields = request_line.split_whitespace();
    let method = fields.next().unwrap_or_default().to_ascii_uppercase();
    let target = fields.next().unwrap_or_default().to_string();

    let mut range = None;
    loop {
        let mut line = String::new();
        match reader.read_line(&mut line) {
            Ok(0) | Err(_) => return,
            Ok(_) => {}
        }
        let line = line.trim_end();
        if line.is_empty() {
            break;
        }
        if let Some((name, value)) = line.split_once(':') {
            if name.trim().eq_ignore_ascii_case("range") {
                range = Some(value.trim().to_string());
            }
        }
    }

    respond(&mut stream, server, &method, &target, range.as_deref());
}

fn respond(
    stream: &mut TcpStream,
    server: &MediaServer,
    method: &str,
    target: &str,
    range: Option<&str>,
) {
    if method != "GET" && method != "HEAD" {
        return write_simple(stream, "405 Method Not Allowed", "text/plain; charset=utf-8", b"");
    }

    // A request target is normally origin form (`/media/...`), but an absolute
    // URI is legal too, so drop the scheme and authority when present.
    let target = target.split(['?', '#']).next().unwrap_or_default();
    let path = match target.split_once("://") {
        Some((_, rest)) => rest.split_once('/').map_or("", |(_, path)| path),
        None => target,
    };

    let segments: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
    if segments.first() != Some(&"media") {
        return write_simple(stream, "404 Not Found", "text/plain; charset=utf-8", b"");
    }
    let Some(token) = segments.get(1) else {
        return write_simple(stream, "404 Not Found", "text/plain; charset=utf-8", b"");
    };

    let Some(file_path) = server.resolve(token) else {
        eprintln!("[media] 404 for unknown token {token}");
        return write_simple(stream, "404 Not Found", "text/plain; charset=utf-8", b"");
    };

    let Some(content_type) = content_type_for(&file_path) else {
        return write_simple(stream, "415 Unsupported Media Type", "text/plain; charset=utf-8", b"");
    };

    let mut file = match File::open(&file_path) {
        Ok(file) => file,
        Err(e) => {
            eprintln!("[media] cannot open {}: {e}", file_path.display());
            return write_simple(stream, "404 Not Found", "text/plain; charset=utf-8", b"");
        }
    };

    let Ok(len) = file.metadata().map(|m| m.len()) else {
        return write_simple(stream, "404 Not Found", "text/plain; charset=utf-8", b"");
    };

    let bodyless = method == "HEAD";
    let wanted = match range {
        Some(raw) => parse_range(raw, len),
        None => Range::Whole,
    };

    let (start, count) = match wanted {
        Range::Whole | Range::Ignore => (0, len),
        Range::Partial(start, count) => (start, count),
        Range::Unsatisfiable => {
            eprintln!("[media] 416 for an out of bounds range on {path}");
            let _ = write!(
                stream,
                "HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */{len}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
            );
            return;
        }
    };

    let partial = matches!(wanted, Range::Partial(..));
    let head = if partial {
        format!(
            "HTTP/1.1 206 Partial Content\r\nContent-Type: {content_type}\r\nAccept-Ranges: bytes\r\nContent-Range: bytes {start}-{}/{len}\r\nContent-Length: {count}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
            start + count - 1
        )
    } else {
        format!(
            "HTTP/1.1 200 OK\r\nContent-Type: {content_type}\r\nAccept-Ranges: bytes\r\nContent-Length: {len}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n"
        )
    };

    eprintln!(
        "[media] {method} {path} -> {status}{suffix}",
        status = if partial { "206" } else { "200" },
        suffix = if bodyless { ", no body" } else { "" }
    );

    if stream.write_all(head.as_bytes()).is_err() || bodyless {
        return;
    }

    if let Err(e) = stream_body(stream, &mut file, start, count) {
        eprintln!("[media] stream ended early: {e}");
    }
}

fn write_simple(stream: &mut TcpStream, status: &str, content_type: &str, body: &[u8]) {
    let head = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        body.len()
    );
    if stream.write_all(head.as_bytes()).is_err() {
        return;
    }
    if stream.write_all(body).is_err() {
        return;
    }
    let _ = stream.flush();
}

/// What to do with the `Range` header of a request.
enum Range {
    /// No header, so the whole file.
    Whole,
    /// A header we do not implement, such as a multi-part range. RFC 7233 lets
    /// the server ignore it and send the whole file.
    Ignore,
    Partial(u64, u64),
    /// A well formed range that falls outside the file.
    Unsatisfiable,
}

/// Resolves a single byte range against a file of `len` bytes.
fn parse_range(raw: &str, len: u64) -> Range {
    let resolve = || -> Option<Range> {
        let spec = raw.trim().strip_prefix("bytes=")?;
        if spec.contains(',') {
            return None;
        }
        let (start, end) = spec.split_once('-')?;

        if start.is_empty() {
            // Suffix range: the last N bytes.
            let suffix: u64 = end.trim().parse().ok()?;
            if suffix == 0 || len == 0 {
                return Some(Range::Unsatisfiable);
            }
            let count = suffix.min(len);
            return Some(Range::Partial(len - count, count));
        }

        let start: u64 = start.trim().parse().ok()?;
        if start >= len {
            return Some(Range::Unsatisfiable);
        }

        let end = if end.trim().is_empty() {
            len - 1
        } else {
            end.trim().parse::<u64>().ok()?.min(len - 1)
        };

        if end < start {
            return Some(Range::Unsatisfiable);
        }

        Some(Range::Partial(start, end - start + 1))
    };

    resolve().unwrap_or(Range::Ignore)
}

fn stream_body(
    stream: &mut TcpStream,
    file: &mut File,
    start: u64,
    count: u64,
) -> std::io::Result<()> {
    file.seek(SeekFrom::Start(start))?;

    let mut remaining = count;
    let mut buffer = vec![0u8; CHUNK];

    while remaining > 0 {
        let want = remaining.min(CHUNK as u64) as usize;
        let read = file.read(&mut buffer[..want])?;
        if read == 0 {
            // The render was replaced underneath us; the webview reloads anyway.
            break;
        }
        stream.write_all(&buffer[..read])?;
        stream.flush()?;
        remaining -= read as u64;
    }

    stream.flush()
}

/// Backs the `media_url` command. Kept separate from the command so the tests
/// can drive a real listener without Tauri state.
#[tauri::command]
pub fn media_url(path: String, server: tauri::State<'_, Arc<MediaServer>>) -> Result<String, String> {
    let resolved = fs::canonicalize(&path).map_err(|e| format!("cannot open {path}: {e}"))?;

    if content_type_for(&resolved).is_none() {
        return Err(format!("unsupported media type: {path}"));
    }

    server.url_for(&resolved)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn clip(dir: &Path, bytes: usize) -> PathBuf {
        let path = dir.join("Scene One.mp4");
        fs::write(&path, vec![7u8; bytes]).unwrap();
        path
    }

    fn request(url: &str, raw: &str) -> String {
        let port: u16 = url
            .split("//")
            .nth(1)
            .and_then(|rest| rest.split('/').next())
            .and_then(|authority| authority.split(':').next_back())
            .unwrap()
            .parse()
            .unwrap();

        let mut stream = TcpStream::connect((Ipv4Addr::LOCALHOST, port)).unwrap();
        stream.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
        stream.write_all(raw.as_bytes()).unwrap();
        stream.flush().unwrap();

        let mut response = Vec::new();
        stream.read_to_end(&mut response).unwrap();
        String::from_utf8_lossy(&response).into_owned()
    }

    fn split_response(raw: &str) -> (&str, &str) {
        let index = raw.find("\r\n\r\n").expect("response has no header terminator");
        (&raw[..index], &raw[index + 4..])
    }

    #[test]
    fn serves_a_video_over_loopback() {
        let dir = std::env::temp_dir().join("manim-studio-test-media-full");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        let server = Arc::new(MediaServer::default());
        let url = server.url_for(&clip(&dir, 2048)).unwrap();
        assert!(url.starts_with("http://127.0.0.1:"), "unexpected url: {url}");
        assert!(url.contains("/media/"), "unexpected url: {url}");

        let response = request(&url, &format!("GET {url} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n"));
        let (head, body) = split_response(&response);

        assert!(head.starts_with("HTTP/1.1 200 OK"), "{head}");
        assert!(head.contains("Content-Type: video/mp4"), "{head}");
        assert!(head.contains("Accept-Ranges: bytes"), "{head}");
        assert!(head.contains("Content-Length: 2048"), "{head}");
        assert_eq!(body.len(), 2048);

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn serves_partial_content_for_ranges() {
        let dir = std::env::temp_dir().join("manim-studio-test-media-range");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        let server = Arc::new(MediaServer::default());
        let url = server.url_for(&clip(&dir, 2048)).unwrap();

        let response = request(
            &url,
            &format!("GET {url} HTTP/1.1\r\nHost: 127.0.0.1\r\nRange: bytes=100-199\r\n\r\n"),
        );
        let (head, body) = split_response(&response);
        assert!(head.starts_with("HTTP/1.1 206 Partial Content"), "{head}");
        assert!(head.contains("Content-Range: bytes 100-199/2048"), "{head}");
        assert!(head.contains("Content-Length: 100"), "{head}");
        assert_eq!(body.len(), 100);

        // The range WebKit opens a stream with.
        let response = request(
            &url,
            &format!("GET {url} HTTP/1.1\r\nHost: 127.0.0.1\r\nRange: bytes=2000-\r\n\r\n"),
        );
        let (head, body) = split_response(&response);
        assert!(head.starts_with("HTTP/1.1 206 Partial Content"), "{head}");
        assert!(head.contains("Content-Range: bytes 2000-2047/2048"), "{head}");
        assert_eq!(body.len(), 48);

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn rejects_unsatisfiable_ranges_and_unknown_tokens() {
        let dir = std::env::temp_dir().join("manim-studio-test-media-errors");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        let server = Arc::new(MediaServer::default());
        let url = server.url_for(&clip(&dir, 512)).unwrap();

        let response = request(
            &url,
            &format!("GET {url} HTTP/1.1\r\nHost: 127.0.0.1\r\nRange: bytes=9999-\r\n\r\n"),
        );
        let (head, body) = split_response(&response);
        assert!(head.starts_with("HTTP/1.1 416"), "{head}");
        assert!(head.contains("Content-Range: bytes */512"), "{head}");
        assert_eq!(body, "");

        let denied = format!("http://127.0.0.1:{}/media/deadbeef/clip.mp4", url_port(&url));
        let response = request(&denied, &format!("GET {denied} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n"));
        assert!(response.starts_with("HTTP/1.1 404 Not Found"), "{response}");

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn head_returns_headers_without_a_body() {
        let dir = std::env::temp_dir().join("manim-studio-test-media-head");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        let server = Arc::new(MediaServer::default());
        let url = server.url_for(&clip(&dir, 300)).unwrap();

        let response = request(&url, &format!("HEAD {url} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n"));
        let (head, body) = split_response(&response);

        assert!(head.starts_with("HTTP/1.1 200 OK"), "{head}");
        assert!(head.contains("Content-Length: 300"), "{head}");
        assert_eq!(body, "");

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn re_registering_a_path_changes_its_url() {
        let dir = std::env::temp_dir().join("manim-studio-test-media-token");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        let server = Arc::new(MediaServer::default());
        let path = clip(&dir, 64);

        let first = server.url_for(&path).unwrap();
        let second = server.url_for(&path).unwrap();
        assert_ne!(first, second, "a re-render must not reuse the old token");
        assert_eq!(server.files.lock().unwrap().len(), 1);

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn only_video_extensions_are_served() {
        let dir = std::env::temp_dir().join("manim-studio-test-media-types");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        assert_eq!(content_type_for(Path::new("/tmp/a.mp4")), Some("video/mp4"));
        assert_eq!(content_type_for(Path::new("/tmp/a.MP4")), Some("video/mp4"));
        assert_eq!(content_type_for(Path::new("/tmp/a.webm")), Some("video/webm"));
        assert_eq!(content_type_for(Path::new("/tmp/a.py")), None);
        assert_eq!(content_type_for(Path::new("/tmp/a")), None);

        fs::remove_dir_all(&dir).unwrap();
    }

    fn url_port(url: &str) -> u16 {
        url.split("//")
            .nth(1)
            .and_then(|rest| rest.split('/').next())
            .and_then(|authority| authority.split(':').next_back())
            .unwrap()
            .parse()
            .unwrap()
    }
}
