# Wool 🧶 - Tiny JavaScript threading library

Wool, or WorkerPool, is a JavaScript library for quick utilization of
[Web Workers][1] for CPU intensive tasks.

It is compatible with [Deno][2] and browsers supporting [Module worker][3].

Features:

- Transformation of ES Modules into worker pool for parallel execution.
- Small, [single file](wool.js), no dependencies.
- Easy to use [API](#API).

## Example

For a quick demonstration of using Wool to speed up computation let's calculate
the Fibonacci number in a very inefficient way.

```js
// fib.js

export function fib(n) {
  return n < 2 ? 1 : fib(n - 1) + fib(n - 2)
}
```

```js
// main.js
import { fib } from "./fib.js"
import ThreadPool from "./wool.js"

const input = new Array(20).fill(40)

// Single threaded
console.log(input.map(fib))

// Multi threaded
const pool = await ThreadPool("./fib.js")
console.log(await pool.map.fib(input))

// Destroy the thread pool after use
pool.destroy()
```

## Installation

The library it contained in a single JS module so you can easily import it from
a URL or copy-paste it to your project.

## API

### `pool = await WorkerPool(module_path, thread_count)`

Instantiates a worker pool from an ES Module. Returns a promise that resolves
with the instantiated pool.

- `module_path` (mandatory) - The relative path to an ES Module to use
- `thread_count` (optional) - The amount of workers to create  
  Default: [`navigator.hardwareConcurrency`][4]

### `await pool.run.$FN(inputs, callback)`

Executes every item from the input array and pass the result to the callback.
Returns a promise which resolves when the entire input array was processed.

This is similar to `inputs.map($FN).forEach(callback)` but every item is
executed in parallel and the output is passed to the callback function in an
indeterministic order.

- `$FN` (mandatory) - An exported function from the provided module
- `inputs` (mandatory) - An array of data that you want to use as inputs
- `callback` (mandatory) - A function to run for every. It's called with the
  following arguments:
  - `output`: (optional) - The current value returned
  - `idx`: (optional) - The index of the current value corresponding to the
    input array

### `output = await pool.map.$FN(inputs)`

Execute every item from the input array and map the output to another array
with the same order. Returns a promise that resolves with the mapped array.

This is similar to `inputs.map($FN)` but every item is executed in parallel

- `$FN` (mandatory) - An exported function from the provided module
- `inputs` (mandatory) - An array of data that you want to use as inputs

### `pool.destroy()`

Terminate all workers which abruptly cancels the running task. The pool can no
longer be used.

## License

This library is licensed under the [MIT License](LICENSE).

[1]: <https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API>
[2]: <https://deno.com/runtime>
[3]: <https://caniuse.com/?search=module%20worker>
[4]: <https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency>
