
import os
defpath = "src/atoms"

while 1:
    name = ""
    while name == "":
        name = input("Name of the atom file: ")
        if name == "":
            print("file name cannot be empty")

    stateName = ""
    while stateName == "":
        stateName = input("Name of the state: ")
        if stateName == "":
            print("state name cannot be empty")
    defstateType = "any"
    stateType = input("type of the state [%s]: " % defstateType)
    if stateType == "":
        stateType = defstateType
    code = """
export const %sAtom = atomWithStorage<%s>('%sState',null);
""" % (stateName, stateType, stateName)
    os.system("clear")
    os.system("echo \"%s\">> %s/%s.ts" % (code, defpath, name))
    print("[done]")
