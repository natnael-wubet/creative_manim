
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'



export const isEditingAtom = atomWithStorage<boolean>('isEditingState',null);

