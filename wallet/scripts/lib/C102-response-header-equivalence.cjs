// RFC 9110 5.1 and 12.5.5: Vary selects request field names. Other values stay exact.
function equivalent(name, consumer, network) {
  if (typeof consumer !== 'string' || typeof network !== 'string') return false;
  if (consumer === network) return true;
  if (name.toLowerCase() !== 'vary') return false;
  const tokens = value => {
    const list = value.split(',').map(v => v.replace(/^[ \t]+|[ \t]+$/g, '').toLowerCase());
    if (list.some(v => !/^[!#$%&'*+\-.^_`|~0-9a-z]+$/.test(v))) return null;
    return list.sort();
  };
  const left = tokens(consumer), right = tokens(network);
  return left !== null && right !== null && left.length === right.length && left.every((v,i) => v === right[i]);
}
module.exports = { equivalent };
