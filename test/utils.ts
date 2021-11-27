import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
  ZoombiesNFT__factory,
  ZoombiesMarketPlace__factory,
  ZoomToken__factory,
  ZoombiesMarketPlace,
  WrappedMovr__factory,
  Global__factory
} from "../typechain";

type ContractName = "ZoombiesNFT" | "ZoombiesMarketPlace" | "ZoomToken" | "WrappedMovr" | "Global";

export async function getContractFactory(
  contractName: "ZoombiesNFT",
  owner: SignerWithAddress
): Promise<ZoombiesNFT__factory>;

export async function getContractFactory(
  contractName: "ZoombiesMarketPlace",
  owner: SignerWithAddress
): Promise<ZoombiesMarketPlace__factory>;

export async function getContractFactory(
  contractName: "ZoomToken",
  owner: SignerWithAddress
): Promise<ZoomToken__factory>;

export async function getContractFactory(
  contractName: "WrappedMovr",
  owner: SignerWithAddress
  ): Promise<WrappedMovr__factory>;
  

  export async function getContractFactory(
	contractName: "Global",
	owner: SignerWithAddress
  ): Promise<Global__factory>;


export async function getContractFactory(
  contractName: ContractName,
  owner: SignerWithAddress
) {
  const factory = await ethers.getContractFactory(contractName, owner);
  return factory;
}

export async function increaseTime(time: number) {
  await ethers.provider.send("evm_increaseTime", [time]);
  await ethers.provider.send("evm_mine", []);
}

interface ItemInfo {
  auctionEnd: number;
  minPrice: number;
  saleToken: string;
  seller: string;
  highestBidder: string;
  highestBid: number;
}

export async function checkItem(
  market: ZoombiesMarketPlace,
  itemId: number,
  expectedInfo: ItemInfo
) {
	const info = await market.Items(itemId)
	expect(info[0]).to.equal(expectedInfo.auctionEnd)
	expect(info[1]).to.equal(expectedInfo.minPrice)
	expect(info[2]).to.equal(expectedInfo.saleToken)
	expect(info[3]).to.equal(expectedInfo.seller)
	expect(info[4]).to.equal(expectedInfo.highestBidder)
	expect(info[5]).to.equal(expectedInfo.highestBid)

}
