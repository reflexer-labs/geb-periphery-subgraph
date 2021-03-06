import { UniswapV2Pair as UniswapV2PairEntity } from './../../generated/schema'
import { UniswapV2Pair as UniswapV2PairContract } from '../../generated/UniCoinPool/UniswapV2Pair'
import * as decimal from '../utils/decimal'
import { Address, ethereum } from '@graphprotocol/graph-ts'

export function getOrCreateUniPool(
  pairAddress: Address,
  event: ethereum.Event,
): UniswapV2PairEntity {
  let pair = UniswapV2PairEntity.load(pairAddress.toHexString())
  if (pair == null) {
    // Create a new pair entity
    pair = new UniswapV2PairEntity(pairAddress.toHexString())
    let pairContract = UniswapV2PairContract.bind(pairAddress)

    pair.address = pairAddress

    pair.token0 = pairContract.token0()
    pair.token1 = pairContract.token1()

    let reserves = pairContract.getReserves()
    pair.reserve0 = decimal.fromWad(reserves.value0)
    pair.reserve1 = decimal.fromWad(reserves.value1)

    if (pair.reserve1.notEqual(decimal.ZERO)) pair.token0Price = pair.reserve0.div(pair.reserve1)
    else pair.token0Price = decimal.ZERO
    if (pair.reserve0.notEqual(decimal.ZERO)) pair.token1Price = pair.reserve1.div(pair.reserve0)
    else pair.token1Price = decimal.ZERO

    pair.totalSupply = decimal.fromWad(pairContract.totalSupply())

    pair.createdAt = event.block.timestamp
    pair.createdAtBlock = event.block.number
    pair.createdAtTransaction = event.transaction.hash
    pair.modifiedAt = event.block.timestamp
    pair.modifiedAtBlock = event.block.number
    pair.modifiedAtTransaction = event.transaction.hash

    pair.save()
  }

  return pair as UniswapV2PairEntity
}
