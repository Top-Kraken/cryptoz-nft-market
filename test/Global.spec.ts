import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { Global } from "../typechain";
import { getContractFactory } from "./utils";

chai.use(waffle.solidity);

describe("Global - valid actions", () => {
  let global: Global,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    owner: SignerWithAddress;

  const tokenId = 1;
  const twoWeeksish = 1209601;
  const maxNFTCount = 256;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    const globalFactory = await getContractFactory("Global", owner);

    global = await globalFactory.deploy();
    await global.deployed();
  });
  it("should pause and unpause", async () => {
    await global.pause();
    expect(await global.paused()).to.be.true;
    await global.unpause();
    expect(await global.paused()).to.be.false;
  });
  it("should whitelist a token", async () => {
    await global.whitelistToken(alice.address, true);
    expect(await global.tokenWhitelist(alice.address)).to.be.true;
    await global.whitelistToken(alice.address, false);
    expect(await global.tokenWhitelist(alice.address)).to.be.false;
  });
  it("should change dollarzoombies address", async () => {
    await global.changeDollarZoombiesAddress(bob.address);
    expect(await global.dollarZoombies()).to.equal(bob.address);
  });
  it("should change dollarzoombies fee", async () => {
    await global.changeZoombiesFee(10);
    expect(await global.zoombiesFee()).to.equal(10);
  });
  it("should change creator fee", async () => {
    await global.changeCreatorFee(10);
    expect(await global.creatorFee()).to.equal(10);
  });
  it("should change max auction time", async () => {
    await global.changeMaxAuctionTime(twoWeeksish);
    expect(await global.maxAuctionTime()).to.equal(twoWeeksish);
  });
  it("should change max nft count", async () => {
    await global.changeMaxNFTCount(maxNFTCount);
    expect(await global.maxNFTCount()).to.equal(maxNFTCount);
  });
});

describe("Global - invalid actions", () => {
  let global: Global,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    owner: SignerWithAddress;

  const tokenId = 1;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    const globalFactory = await getContractFactory("Global", owner);

    global = await globalFactory.deploy();
    await global.deployed();
  });
  it("should fail to pause and unpause", async () => {
    await expect(global.connect(alice).pause()).revertedWith(
      "ZoombiesNFT: User does not have admin role"
    );
    await expect(global.connect(alice).unpause()).revertedWith(
      "ZoombiesNFT: User does not have admin role"
    );
  });
  it("should fail to whitelist a token", async () => {
    await expect(
      global.connect(alice).whitelistToken(alice.address, true)
    ).revertedWith("ZoombiesNFT: User does not have admin role");
  });
  it("should fail to change dollarzoombies address", async () => {
    await expect(
      global.connect(alice).changeDollarZoombiesAddress(alice.address)
    ).revertedWith("ZoombiesNFT: User does not have admin role");
  });
  it("should fail to change dollarzoombies fee", async () => {
    await expect(global.connect(alice).changeZoombiesFee(10)).revertedWith(
      "ZoombiesNFT: User does not have admin role"
    );
    await expect(global.changeZoombiesFee(30)).revertedWith("not in bounds");
    await expect(global.changeZoombiesFee(30)).revertedWith("not in bounds");
  });
  it("should fail to change creator fee", async () => {
    await expect(global.connect(alice).changeCreatorFee(10)).revertedWith(
      "ZoombiesNFT: User does not have admin role"
    );
    await expect(global.changeCreatorFee(30)).revertedWith("not in bounds");
    await expect(global.changeCreatorFee(30)).revertedWith("not in bounds");
  });
  it("should fail to change max auction time", async () => {
    await expect(global.connect(alice).changeMaxAuctionTime(10)).revertedWith(
      "ZoombiesNFT: User does not have admin role"
    );
    await expect(global.changeMaxAuctionTime(12096010000)).revertedWith(
      "not in bounds"
    );
    await expect(global.changeMaxAuctionTime(12096010000)).revertedWith(
      "not in bounds"
    );
  });
  it("should fail to change max nft count", async () => {
    await expect(global.connect(alice).changeMaxNFTCount(10)).revertedWith(
      "ZoombiesNFT: User does not have admin role"
    );
    await expect(global.changeMaxNFTCount(0)).revertedWith(
      "invalid MaxNFTCount"
    );
  });
});
