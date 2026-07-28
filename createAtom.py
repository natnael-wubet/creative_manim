import os
defpath = "src/atoms"

while 1:
    name = ""
    while name == "":
        name = input("Name of the atom: ")
        if name == "":
            print("name cannot be empty")

    code = """
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

"""
    os.system("clear")
    os.system("echo \"%s\">> %s/%s.ts" % (code, defpath, name))
    print("[done]")
