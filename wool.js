function CreateWorker(worker_url) {
  const worker = new Worker(worker_url, { type: "module" })

  return new Promise(resolve => worker.addEventListener('message', e => {
    const msg = e.data
    if (msg != 'ready') throw new Error(`Expected 'ready', got '${msg}'`)

    resolve(worker)
  }, { once: true }))
}

function CreateWorkers(worker_url, count) {
  let workers = new Array(count)
  for (let i = 0; i < count; ++i) workers[i] = CreateWorker(worker_url)

  return Promise.all(workers)
}

export default async function WorkerPool(
  module_path,
  thread_count = navigator.hardwareConcurrency
) {
  const url = new URL(module_path, import.meta.url).href
  const worker_code = `
    import * as module from "${url}"

    addEventListener("message", e => {
      const { fn, input, idx } = e.data
      const output = module[fn](input)

      postMessage({output, idx})
    })

    postMessage("ready")
  `

  const worker_blob = new Blob([worker_code], { type: "text/javascript" })
  const worker_url = URL.createObjectURL(worker_blob)
  const workers = await CreateWorkers(worker_url, thread_count)

  let pool = {
    run: {},
    map: {},
    destroy: function() {
      for (const worker of workers) worker.terminate()

      pool = null
    }
  }

  let current_task = null

  for (const [key, value] of Object.entries(await import(url))) {
    if (typeof value != "function") continue
    
    pool.run[key] = function(inputs, callback) {
      if (current_task) {
        throw new Error(`Worker pool is busy processing '${current_task}'`)
      }
      current_task = key

      return new Promise(resolve => {
        let remaining = Math.min(workers.length, inputs.length)
        let current_idx = 0

        if (remaining == 0) resolve([])

        for (let i = 0; i < remaining; ++i) {
          workers[i].postMessage({
            fn: key,
            input: inputs[current_idx],
            idx: current_idx++
          })
        }

        function worker_message(e) {
          const {output, idx} = e.data
          callback(output, idx)

          if (current_idx < inputs.length) {
            e.target.postMessage({
              fn: key,
              input: inputs[current_idx],
              idx: current_idx++
            })
          } else {
            remaining--

            if (remaining == 0) {
              current_task = null
              for (const worker of workers) {
                worker.removeEventListener("message", worker_message)
              }
              resolve()
            }
          }
        }

        for (const worker of workers) {
          worker.addEventListener("message", worker_message)
        }
      })
    }

    pool.map[key] = async function(inputs) {
      let outputs = new Array(inputs.length)
      await pool.run[key](inputs, (output, idx) => outputs[idx] = output)
      return outputs
    }
  }

  return pool
}
