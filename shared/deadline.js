export async function withDeadline(
  promise,
  milliseconds,
  schedule = setTimeout,
  cancel = clearTimeout,
) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = schedule(() => reject(new Error('Request timed out')), milliseconds)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    cancel(timer)
  }
}
