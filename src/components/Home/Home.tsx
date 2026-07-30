import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Motion Primitives
import { Button, Title, Text, Container, Group, Paper, Stack } from "@mantine/core";
import { useAtom } from "jotai";
import { recentProjectsAtom } from "../../atoms/projects";
import { Spotlight } from "../ui/spotlight";
import { BackgroundBeams } from "../ui/background-beams";
import { cn } from "../../lib/utils";
import { Plus, FolderOpen } from "lucide-react";
const createNewProject = () => console.log("New project");
const openProject = () => console.log("Open project");

interface Project {
	id: string;
	name: string;
	lastModified: string;
}

const initialProjects: Project[] = [
];

const ProjectCard = ({ project, index }: { project: Project; index: number }) => (
	<motion.div
		initial={{ opacity: 0, y: 20 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ delay: 0.1 * index, duration: 0.4 }}
		whileHover={{ scale: 1.02, y: -4 }}
		className="w-full"
	>
		<Paper
			shadow="sm"
			p="md"
			radius="md"
			className={cn(
				"border border-transparent cursor-pointer transition-all duration-300",
				"hover:border-[#74c0fc] hover:shadow-md"  // Uses Mantine primary color as accent
			)}
		>
			<Group position="apart">
				<div>
					<Text weight={600} size="md" className="text-[#1a1b1e] dark:text-[#c1c2c5]">
						{project.name}
					</Text>
					<Text size="xs" color="dimmed">
						Last modified: {project.lastModified}
					</Text>
				</div>
			</Group>
		</Paper>
	</motion.div>
);

export default function Home() {
	const [recentProjects] = useAtom(recentProjectsAtom);
	const projects = recentProjects.length > 0 ? recentProjects : initialProjects;

	return (
		<>
			<div className="relative min-h-screen w-full overflow-hidden bg-[#f8f9fa] dark:bg-[#1a1b1e]">
				<Spotlight className="absolute top-0 left-0 z-0" />

				<BackgroundBeams className="absolute inset-0 z-0 opacity-60" />

				<Container size="lg" className="relative z-10 flex flex-col items-center justify-center min-h-screen py-20">
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, ease: "easeOut" }}
						className="text-center mb-16"
					>
						<Title
							order={1}
							className="text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-4"
						>
							<span className="bg-gradient-to-r from-[#1c7ed6] via-[#4263eb] to-[#ae3ec9] bg-clip-text text-transparent">
								Manim Studio
							</span>
						</Title>

						<Text size="xl" color="dimmed" className="text-2xl md:text-3xl max-w-2xl mx-auto">
							Bring your ideas{" "}
							<span className="relative inline-block">
								to life.
								<motion.span
									className="absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-[#1c7ed6] to-[#ae3ec9]"
									initial={{ scaleX: 0 }}
									animate={{ scaleX: 1 }}
									transition={{ delay: 0.6, duration: 0.5 }}
									style={{ originX: 0 }}
								/>
							</span>
						</Text>

						<Group position="center" spacing="lg" mt="xl">
							<motion.div
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.98 }}
							>
								<Button
									size="lg"
									radius="md"
									variant="gradient"
									gradient={{ from: "blue", to: "cyan" }}

									leftSection={
										<motion.span
											initial={{ rotate: 0 }}
											whileHover={{ rotate: 90, scale: 1.2 }}
											transition={{ type: "spring", stiffness: 300 }}
											style={{ display: "inline-flex" }}
										>
											<Plus size={20} strokeWidth={2.5} />
										</motion.span>
									}
									className="text-lg px-8 py-3 shadow-lg hover:shadow-xl transition-shadow"
									onClick={createNewProject}
								>
									New Project
								</Button>
							</motion.div>

							<motion.div
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.98 }}
							>
								<Button
									size="lg"
									radius="md"

									leftSection={
										<motion.span
											initial={{ rotate: 0, y: 0 }}
											whileHover={{ rotate: -10, y: -2, scale: 1.15 }}
											transition={{ type: "spring", stiffness: 400 }}
											style={{ display: "inline-flex" }}
										>
											<FolderOpen size={20} strokeWidth={2.5} />
										</motion.span>
									}
									variant="outline"
									className="text-lg px-8 py-3 border-2 border-[#74c0fc] text-[#1c7ed6] hover:bg-[#e7f5ff] dark:border-[#4dabf7] dark:text-[#4dabf7] dark:hover:bg-[#0c1428] transition-colors"
									onClick={openProject}
								>
									Open Project
								</Button>
							</motion.div>
						</Group>
					</motion.div>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.4, duration: 0.6 }}
						className="w-full max-w-2xl"
					>
						<Text size="lg" weight={600} mb="md" className="text-center md:text-left">
							Recent Projects
						</Text>

						<Stack spacing="md">
							<AnimatePresence>
								{projects.map((project, idx) => (
									<ProjectCard key={project.id} project={project} index={idx} />
								))}
							</AnimatePresence>
						</Stack>

						{projects.length === 0 && (
							<Text align="center" color="dimmed" mt="xl">
								No projects yet. Create one to get started!
							</Text>
						)}
					</motion.div>
				</Container>
			</div>
		</>
	);
}
