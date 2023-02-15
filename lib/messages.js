const PROTOCOL = 'HYPERSWARM_CLUSTER'

const METHODS = { 
  join: "JOIN",
  joinFlushed: "JOIN_FLUSHED"
}

/**
 * @param {keyof METHODS} method
 * @param {object | []} data
 */
export function encode(method, data) {
  return PROTOCOL + '-' + METHODS[method] + '-' + JSON.stringify(data)
}

/**
 * @param {string} message
 */
export function decode (message) {
  const [protocol, method, data] = message.split('-')
  if (protocol !== PROTOCOL) {
    return;
  }
  return {
    method, 
    args: JSON.parse(data)
  }
}
