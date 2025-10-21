// Three-way merge for JSON trees composed of Objects, Arrays, Strings, and Numbers.
export function merge(ancestor, local, remote) {
  const valueForTyping = local || remote
  if (valueForTyping === null || valueForTyping === undefined) {
    // Both null
    return null
  } else if (typeof valueForTyping === "string" || typeof valueForTyping === "number") {
    // Leaf node
    if (local === remote) {
      // Both changed or unchanged
      return local
    } else if (remote === ancestor) {
      // Local changed
      return local
    } else if (local === ancestor) {
      // Remote changed
      return remote
    } else {
      // Both changed, favor local for now, consider better behavior
      console.error("Merge conflict for ", local, remote)
      return local
    }
  } else if (Array.isArray(valueForTyping)) {
    // Array
    let length = Math.max(local?.length, remote?.length)
    let mergedArray = []
    let mergedArrayIsEmpty = true
    for (let i = 0; i < length; ++i) {
      let mergedElement = merge(ancestor?.[i], local?.[i], remote?.[i])
      if (mergedElement !== null) {
        mergedArrayIsEmpty = false
        mergedArray.push(mergedElement)
      }
    }
    if (mergedArrayIsEmpty) {
      return null
    }
    return mergedArray
  } else {
    // Object
    const localKeys = new Set(Object.keys(local))
    const remoteKeys = new Set(Object.keys(remote))
    const keys = localKeys.union(remoteKeys)
    let mergedObject = {}
    let mergedObjectIsEmpty = true
    for (const key of keys) {
      let mergedValue = merge(ancestor?.[key], local?.[key], remote?.[key])
      if (mergedValue !== null) {
        mergedObjectIsEmpty = false
        mergedObject[key] = mergedValue
      }
    }
    if (mergedObjectIsEmpty) {
      return null
    }
    return mergedObject
  }
}
