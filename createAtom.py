import os
defpath = "src/atoms"

while 1:
    name = ""
    while name == "":
        name = input("Name of the atom: ")
        if name == "":
            print("name cannot be empty")

    code = """
import { atom } from 'recoil';

import { recoilPersist } from 'recoil-persist';

const { persistAtom } = recoilPersist();
"""
    os.system("clear")
    os.system("echo \"%s\">> %s/%s.ts" % (code, defpath, name))
    print("[done]")
