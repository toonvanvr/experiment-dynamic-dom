import { nil, Nil } from "./symbols.js";

type UnhookFn = () => void;
type ActionFn<T> = (value: T, hook: Hook<T>) => void;
export interface Hook<T> {
  action: ActionFn<T>;
  unhook: UnhookFn;
}

export class Var<T> {
  #value: T | Nil;
  #hooks = new Set<Hook<T>>();
  #next: Promise<T> | null = null;

  constructor(value: T | Nil = nil) {
    this.#value = value;
  }

  hook(
    action: ActionFn<T>,
    { once = false, injectCache = true } = {}
  ): Hook<T> {
    let hook: Hook<T>;
    hook = {
      action,
      unhook: () => {
        this.#hooks.delete(hook);
      },
    };
    this.#hooks.add(hook);
    if (once) {
      this.next().then(hook.unhook);
    }
    if (injectCache && this.#value !== nil) {
      action(this.#value, hook);
    }
    return hook;
  }

  set(value: T) {
    this.#value = value;
    for (const hook of this.#hooks) {
      hook.action(value, hook);
    }
  }

  get(noNil: true): Promise<T>;
  get(noNil: false): T | Nil;
  get(noNil = true) {
    if (noNil && this.#value === nil) {
      return this.next();
    } else {
      return this.#value;
    }
  }

  next(): Promise<T> {
    if (!this.#next) {
      return (this.#next = new Promise<T>((resolve) => {
        this.hook(resolve, { once: true });
      }));
    } else {
      return this.#next;
    }
  }
}
