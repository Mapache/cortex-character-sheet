export async function asyncMap(array, transform) {
  return await Promise.all(array.map(async (element) => {
    return await transform(element)
  }))
}

export async function asyncFilter(array, predicate) {
  const filterResults = await Promise.all(array.map(async (element) => {
    return await predicate(element)
  }))
  return array.filter((_, index) => filterResults[index])
}