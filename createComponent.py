import os
defpath = "src/components"
while 1:
    path = input("path:[default %s] " % (defpath))
    if path == "":
        path = defpath

    name = ""
    while name == "":
        name = input("Name of the component: ")
        if name == "":
            print("name cannot be empty")


    code = """
import './%s.module.css'
const %s: React.FC = () => {
  return (
    <div>
    </div>
  );
};

export default %s;
    """ % (name, name, name)
    indcode = "export {default} from './%s.tsx'" % name
    os.system("clear")
    os.system("mkdir %s/%s" % (path, name))
    os.system("touch %s/%s/%s.module.css" % (path, name, name))
    os.system("touch %s/%s/%s.tsx" % (path, name, name))
    os.system("touch %s/%s/index.ts" % (path, name))
    os.system("echo \"%s\" >%s/%s/%s.tsx" % (code, path, name, name))
    os.system("echo \"%s\" >%s/%s/index.ts" % (indcode, path,  name))
    print("[done] %s/%s component created" % (path, name))
