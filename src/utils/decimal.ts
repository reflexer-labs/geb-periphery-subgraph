import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export { BigDecimal }

export let ONE = fromNumber(1)
export let ZERO = fromNumber(0)

// @ts-ignore
let WAD_PRECISION = <u8>18
// @ts-ignore
let RAY_PRECISION = <u8>27
// @ts-ignore
let RAD_PRECISION = <u8>45

let WAD = BigInt.fromI32(10)
  .pow(WAD_PRECISION)
  .toBigDecimal()

let RAY = BigInt.fromI32(10)
  .pow(RAY_PRECISION)
  .toBigDecimal()

let RAD = BigInt.fromI32(10)
  .pow(RAD_PRECISION)
  .toBigDecimal()

export function fromNumber(n: number): BigDecimal {
  return BigDecimal.fromString(n.toString())
}

export function fromRad(value: BigInt): BigDecimal {
  return value.divDecimal(RAD)
}

export function fromRay(value: BigInt): BigDecimal {
  return value.divDecimal(RAY)
}

export function fromWad(value: BigInt): BigDecimal {
  return value.divDecimal(WAD)
}

export function toRad(value: BigDecimal): BigInt {
  return value.times(RAD).truncate(0).digits
}

export function toRay(value: BigDecimal): BigInt {
  return value.times(RAY).truncate(0).digits
}

export function toWad(value: BigDecimal): BigInt {
  return value.times(WAD).truncate(0).digits
}

export let wadBigInt = BigInt.fromI32(10).pow(WAD_PRECISION)

export let rayBigInt = BigInt.fromI32(10).pow(RAY_PRECISION)

export let radBigInt = BigInt.fromI32(10).pow(RAD_PRECISION)
