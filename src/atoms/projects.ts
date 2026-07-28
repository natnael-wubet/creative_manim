
import { atom } from 'recoil';

import { recoilPersist } from 'recoil-persist';

const { persistAtom } = recoilPersist();


export const isEditingState = atom<boolean>({
	key: 'isEditingState',
	default: false,

	effects_UNSTABLE: [persistAtom],
});

