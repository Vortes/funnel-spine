import { createContext } from 'react';

export const ComparisonMotionContext = createContext<'before' | 'after'>('after');
