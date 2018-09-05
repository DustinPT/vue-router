/* @flow */

import { inBrowser } from './dom'
import { saveScrollPosition } from './scroll'
import type Router from "../index";

export const supportsPushState = inBrowser && (function () {
  const ua = window.navigator.userAgent

  if (
    (ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) &&
    ua.indexOf('Mobile Safari') !== -1 &&
    ua.indexOf('Chrome') === -1 &&
    ua.indexOf('Windows Phone') === -1
  ) {
    return false
  }

  return window.history && 'pushState' in window.history
})()

// use User Timing api (if present) for more accurate key precision
const Time = inBrowser && window.performance && window.performance.now
  ? window.performance
  : Date

let _key: string = genKey()
let _prevKey: string
let storeKey = 'state_keys'
let _keys: Array<string>

export function setupPushState (router: Router) {
  if (router.options.stateKeyStoreName) storeKey = router.options.stateKeyStoreName
  const storedKeys = window.sessionStorage.getItem(storeKey)
  _keys = storedKeys ? JSON.parse(storedKeys) : []
  if (_keys.length === 0) {
    window.dispatchEvent(new CustomEvent('vue_router_state_keys_init'))
  }
}

export function pushKey (currentKey: string, key: string) {
  console.log(`pushKey: ${currentKey} => ${key}`)
  _prevKey = currentKey
  const idx = currentKey ? _keys.indexOf(currentKey) : -1
  if (idx === -1) {
    if (currentKey) console.log(`state key not found: ${currentKey}`)
    _keys.push(key)
  } else if (idx < _keys.length - 1) {
    window.dispatchEvent(new CustomEvent('vue_router_state_keys_deleted', { detail: _keys.slice(idx + 1) }))
    _keys.splice(idx + 1, _keys.length - idx - 1, key)
  } else {
    _keys.push(key)
  }
  window.sessionStorage.setItem(storeKey, JSON.stringify(_keys))
}

export function replaceKey (currentKey: string, key: string) {
  console.log(`replaceKey: ${currentKey} => ${key}`)
  const idx = currentKey ? _keys.indexOf(currentKey) : -1
  if (idx !== -1) {
    window.dispatchEvent(new CustomEvent('vue_router_state_keys_deleted', { detail: _keys.slice(idx, idx + 1) }))
    _keys.splice(idx, 1, key)
  } else {
    if (currentKey) console.log(`state key not found: ${currentKey}`)
    _keys.push(key)
  }
  window.sessionStorage.setItem(storeKey, JSON.stringify(_keys))
}

function genKey (): string {
  return Time.now().toFixed(3)
}

export function getStateKey () {
  return _key
}

export function setStateKey (key: string) {
  _key = key
}

export function getPrevStateKey () {
  return _prevKey
}

export function setPrevStateKey (key: string) {
  _prevKey = key
}

export function pushState (url?: string, replace?: boolean) {
  saveScrollPosition()
  // try...catch the pushState call to get around Safari
  // DOM Exception 18 where it limits to 100 pushState calls
  const history = window.history
  try {
    const currentKey = _key
    if (replace) {
      _key = genKey()
      history.replaceState({ key: _key }, '', url)
      replaceKey(currentKey, _key)
    } else {
      _key = genKey()
      history.pushState({ key: _key }, '', url)
      pushKey(currentKey, _key)
    }
  } catch (e) {
    window.location[replace ? 'replace' : 'assign'](url)
  }
}

export function replaceState (url?: string) {
  pushState(url, true)
}
