// Fallback lightweight type declarations for zustand when real types are not resolved.
// Remove this file once the IDE properly picks up node_modules/zustand types.
declare module 'zustand' {
  export interface StoreApi<T> {
    getState: () => T;
    setState: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
    subscribe: (listener: (state: T, prev: T) => void) => () => void;
  }
  export type StateCreator<T, Middleware extends any[] = [], ReturnType = T> = (
    set: StoreApi<T>['setState'],
    get: StoreApi<T>['getState'],
    api: StoreApi<T>
  ) => ReturnType;
  export interface UseBoundStore<T> {
    (): T;
    getState: () => T;
  }
  export function create<T>(createState: StateCreator<T>): UseBoundStore<T>;
  export function create<T>(): (createState: StateCreator<T>) => UseBoundStore<T>;
}

declare module 'zustand/middleware' {
  import { StateCreator } from 'zustand';
  export function devtools<T extends object>(initializer: StateCreator<T, any>): StateCreator<T, any>;
  export function subscribeWithSelector<T extends object>(initializer: StateCreator<T, any>): StateCreator<T, any>;
}
