import { Address, ethereum, log } from '@graphprotocol/graph-ts'
import { ERC20 as ERC20Contract } from '../../generated/Coin/ERC20'
import { ERC20, ERC20Balance, ERC20Allowance } from '../../generated/schema'
import * as decimal from '../utils/decimal'
import * as interger from '../utils/integer'

export function getOrCreateERC20(tokenAddress: Address): ERC20 {
  let erc20 = ERC20.load(tokenAddress.toHexString())

  if (!erc20) {
    erc20 = new ERC20(tokenAddress.toHexString())
    let contract = ERC20Contract.bind(tokenAddress)
    erc20.name = contract.name()
    erc20.symbol = contract.symbol()
    erc20.decimals = interger.fromNumber(contract.decimals())
    erc20.totalSupply = decimal.fromWad(contract.totalSupply())
  }

  return erc20 as ERC20
}

export function getOrCreateERC20Balance(
  address: Address,
  tokenAddress: Address,
  event: ethereum.Event,
  canCreate: boolean = true,
): ERC20Balance {
  let id = balanceId(address, tokenAddress)
  let balance = ERC20Balance.load(id)
  if (balance == null) {
    if (!canCreate) {
      log.critical("ERC20 balance does not exist and can't be created: {}", [id])
    }
    balance = new ERC20Balance(id)
    balance.tokenAddress = tokenAddress
    balance.address = address
    balance.balance = decimal.ZERO

    balance.modifiedAt = event.block.timestamp
    balance.modifiedAtBlock = event.block.number
    balance.modifiedAtTransaction = event.transaction.hash
  }
  balance.save()
  return balance as ERC20Balance
}

export function getOrCreateERC20BAllowance(
  address: Address,
  tokenAddress: Address,
  approvedAddress: Address,
  event: ethereum.Event,
  canCreate: boolean = true,
): ERC20Allowance {
  let id = allowanceId(address, tokenAddress, approvedAddress)
  let allowance = ERC20Allowance.load(id)

  if (allowance == null) {
    if (!canCreate) {
      log.critical("ERC20 allowance does not exist and can't be created: {}", [id])
    }

    let balance = ERC20Balance.load(tokenAddress.toHexString() + '-' + address.toHexString())

    // Need to create the balance in case we approve an empty balance
    if (balance == null) {
      balance = getOrCreateERC20Balance(address, tokenAddress, event)
    }

    allowance = new ERC20Allowance(id)
    allowance.tokenAddress = tokenAddress
    allowance.address = address
    allowance.balance = balance.id
    allowance.approvedAddress = approvedAddress
    allowance.amount = decimal.ZERO
    allowance.modifiedAt = event.block.timestamp
    allowance.modifiedAtBlock = event.block.number
    allowance.modifiedAtTransaction = event.transaction.hash
  }
  allowance.save()
  return allowance as ERC20Allowance
}

export function updateAllowance(
  tokenAddress: Address,
  allowedAddress: Address,
  approvedAddress: Address,
  event: ethereum.Event,
): void {
  let allowance = getOrCreateERC20BAllowance(allowedAddress, tokenAddress, approvedAddress, event)

  if (allowance) {
    let tokenContract = ERC20Contract.bind(tokenAddress)
    allowance.amount = decimal.fromWad(tokenContract.allowance(allowedAddress, approvedAddress))
    allowance.save()
  }
}

export function balanceId(address: Address, tokenAddress: Address): string {
  return tokenAddress.toHexString() + '-' + address.toHexString()
}

export function allowanceId(
  address: Address,
  tokenAddress: Address,
  approvedAddress: Address,
): string {
  return (
    tokenAddress.toHexString() + '-' + address.toHexString() + '-' + approvedAddress.toHexString()
  )
}
