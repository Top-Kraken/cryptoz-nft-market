import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { ZoombiesMarketPlace, ZoomToken, WrappedMovr, ZoombiesNFT } from "../typechain";
import { getContractFactory, checkItem, increaseTime } from "./utils";

chai.use(waffle.solidity);

describe("ZoombiesMarketplace - valid actions", () => {
  let market: ZoombiesMarketPlace,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
	  charlie: SignerWithAddress,
    owner: SignerWithAddress,
    currentTime: any,
    token: ZoomToken,
    nft: ZoombiesNFT,
	  wXMovr: WrappedMovr;
  const tokenId = 1;
  const oneDay = 86400;
  const NULL_ADDRESS = `0x${"0".repeat(40)}`;

  beforeEach(async () => {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    const nftFactory = await getContractFactory("ZoombiesMarketPlace", owner);
    const tokenFactory = await getContractFactory("ZoomToken", owner);
    const nftTokenFactory = await getContractFactory("ZoombiesNFT", owner);
	const wXMovrFactory = await getContractFactory("WrappedMovr", owner);

  wXMovr = await wXMovrFactory.deploy();
	await wXMovr.deployed()
  token = await tokenFactory.deploy();
  nft = await nftTokenFactory.deploy("test", "test");
    market = await nftFactory.deploy("test", "test", wXMovr.address, nft.address);
    await nft.setApprovalForAll(market.address, true);
    await nft.connect(alice).setApprovalForAll(market.address, true);
    await nft.connect(bob).setApprovalForAll(market.address, true);
    await nft.connect(charlie).setApprovalForAll(market.address, true);

    await nft.safemint(owner.address, tokenId);
    await market.deployed();
    await token.deployed();
    await market.safemint(owner.address, tokenId);
    const block = await ethers.provider.getBlock("latest");
    currentTime = block.timestamp;
	await market.whitelistToken(token.address, true);
	await market.whitelistToken(wXMovr.address, true);
  await market.listItem(currentTime + oneDay, 100, [tokenId], token.address);
  });

  it("should list item", async () => {
    expect(await market.originalOwner(tokenId)).to.equal(
      owner.address,
      "owner should now be original owner"
    );
    const expectedItem = {
      auctionEnd: currentTime + oneDay,
      minPrice: 100,
      saleToken: token.address,
      seller: owner.address,
      highestBidder: NULL_ADDRESS,
      tokenIds: [tokenId],
      highestBid: 0,
    };
    await checkItem(market, 0, expectedItem);
    expect(await market.itemCount()).to.equal(1);
  });
  it("should bid auction style", async () => {
    await token.mint(owner.address, 100);
    await token.approve(market.address, 100);
    await market.bid(0, 100);

    const expectedItem = {
      auctionEnd: currentTime + oneDay,
      minPrice: 100,
      saleToken: token.address,
      seller: owner.address,
      highestBidder: owner.address,
      tokenIds: [tokenId],
      highestBid: 100,
    };
    await checkItem(market, 0, expectedItem);
    expect(await token.balanceOf(owner.address)).to.equal(
      0,
      "funds should have been taken"
    );
    expect(await token.balanceOf(market.address)).to.equal(
      100,
      "funds should be in market"
    );
  });
  it("should bid insta sell", async () => {
    await nft.safemint(alice.address, 2);
    await market.safemint(alice.address, 2);
    await token.mint(bob.address, 100);
    await token.connect(bob).approve(market.address, 100);

    await market.connect(alice).listItem(0, 100, [2], token.address);
    await market.connect(bob).bid(1, 100);
    const expectedItem = {
      auctionEnd: 0,
      minPrice: 0,
      saleToken: NULL_ADDRESS,
      seller: NULL_ADDRESS,
      highestBidder: NULL_ADDRESS,
      tokenIds: [0],
      highestBid: 0,
    };
    await checkItem(market, 1, expectedItem);
    expect(await token.balanceOf(bob.address)).to.equal(
      0,
      "funds should have been taken"
    );
    expect(await token.balanceOf(market.address)).to.equal(
      0,
      "funds should have been taken"
    );

    expect(await token.balanceOf(alice.address)).to.equal(
      95,
      "funds should have been taken"
    );
    expect(await token.balanceOf(owner.address)).to.equal(
      5,
      "funds should have been taken"
    );
  });
  it("should bid twice auction style then settle and auction again maintain original seller", async () => {
    await token.mint(alice.address, 100);
    await token.connect(alice).approve(market.address, 100);
    await market.connect(alice).bid(0, 100);

    const expectedItem = {
      auctionEnd: currentTime + oneDay,
      minPrice: 100,
      saleToken: token.address,
      seller: owner.address,
      highestBidder: alice.address,
      tokenIds: [tokenId],
      highestBid: 100,
    };
    await checkItem(market, 0, expectedItem);
    expect(await token.balanceOf(market.address)).to.equal(
      100,
      "funds should have been sent"
    );

    expect(await token.balanceOf(alice.address)).to.equal(
      0,
      "funds should have been taken"
    );

    await token.mint(bob.address, 200);
    await token.connect(bob).approve(market.address, 200);
    await market.connect(bob).bid(0, 200);

    const expectedItem2 = {
      auctionEnd: currentTime + oneDay,
      minPrice: 100,
      saleToken: token.address,
      seller: owner.address,
      highestBidder: bob.address,
      tokenIds: [tokenId],
      highestBid: 200,
    };
    await checkItem(market, 0, expectedItem2);
    expect(await token.balanceOf(market.address)).to.equal(
      200,
      "funds should have been sent"
    );

    expect(await token.balanceOf(alice.address)).to.equal(
      100,
      "funds should have been returned"
    );
    expect(await token.balanceOf(bob.address)).to.equal(
      0,
      "funds should have been taken"
    );
	
    await increaseTime(oneDay + 1);
	await market.settle(0)

	expect(await token.balanceOf(owner.address)).to.equal(
		200,
		"funds should have been rewarded"
	  );
	await market.connect(bob).listItem(0, 100, [tokenId], token.address);
	//original owner maintained
	expect(await market.originalOwner(tokenId)).to.equal(
		owner.address,
		"owner should now be original owner"
	  );

	  await token.mint(charlie.address, 100);
      await token.connect(charlie).approve(market.address, 100);

	  await market.connect(charlie).bid(1, 100);

	  expect(await token.balanceOf(owner.address)).to.equal(
		210,
		"funds should have been rewarded"
	  );

	  //original owner maintained
	expect(await market.originalOwner(tokenId)).to.equal(
		owner.address,
		"owner should now be original owner"
	  );

  });
  it("should bid twice auction style then settle and auction again maintain original seller but with native wrap and unwrap", async () => {
	const originalAliceBalance = await alice.getBalance()
	const originalBobBalance = await bob.getBalance()
	const originalOwnerBalance = await owner.getBalance()

  await nft.safemint(owner.address, 2);
	await market.safemint(owner.address, 2);
    await market.listItem(currentTime + oneDay, 100, [2], wXMovr.address);
    await market.connect(alice).bid(1, 100, {value: 100});

	const expectedItem = {
      auctionEnd: currentTime + oneDay,
      minPrice: 100,
      saleToken: wXMovr.address,
      seller: owner.address,
      highestBidder: alice.address,
      tokenIds: [2],
      highestBid: 100,
    };
    await checkItem(market, 1, expectedItem);
	// wraps and holds funds in token
    expect(await wXMovr.balanceOf(market.address)).to.equal(
      100,
      "funds should have been sent"
    );

    expect(await alice.getBalance()).to.be.below(
		originalAliceBalance,
      "funds should have been taken"
    );

    await market.connect(bob).bid(1, 200, {value: 200});

    const expectedItem2 = {
      auctionEnd: currentTime + oneDay,
      minPrice: 100,
      saleToken: wXMovr.address,
      seller: owner.address,
      highestBidder: bob.address,
      tokenIds: [2],
      highestBid: 200,
    };
    await checkItem(market, 1, expectedItem2);

    expect(await wXMovr.balanceOf(market.address)).to.equal(
      200,
      "funds should have been sent"
    );
    expect(await alice.getBalance()).to.be.below(
      (originalAliceBalance),
      "funds should have been returned"
    );
    expect(await bob.getBalance()).to.be.below(
      originalBobBalance,
      "funds should have been taken"
    );
	
    await increaseTime(oneDay + 1);
	await market.settle(1)

	expect(await owner.getBalance()).to.be.below(
		originalOwnerBalance,
		"funds should have been rewarded"
	  );
	await market.connect(bob).listItem(0, 100, [2], wXMovr.address);
	//original owner maintained
	expect(await market.originalOwner(2)).to.equal(
		owner.address,
		"owner should now be original owner"
	  );


	  await market.connect(charlie).bid(2, 100, {value: 100});

	  expect(await owner.getBalance()).to.be.below(
		originalOwnerBalance.add(210),
		"funds should have been rewarded"
	  );

	  //original owner maintained
	expect(await market.originalOwner(tokenId)).to.equal(
		owner.address,
		"owner should now be original owner"
	  );

  });
});

describe("ZoombiesMarketplace - invalid actions", () => {
  let market: ZoombiesMarketPlace,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    owner: SignerWithAddress,
    token: ZoomToken,
    nft: ZoombiesNFT,
    currentTime: number;

  const tokenId = 1;
  const twoWeeks = 1209600;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    const nftFactory = await getContractFactory("ZoombiesMarketPlace", owner);
    const nftTokenFactory = await getContractFactory("ZoombiesNFT", owner);
    const tokenFactory = await getContractFactory("ZoomToken", owner);

    nft = await nftTokenFactory.deploy("test", "test");
    market = await nftFactory.deploy("test", "test", alice.address, nft.address);
    token = await tokenFactory.deploy();
    await nft.setApprovalForAll(market.address, true);

    await market.deployed();
    await token.deployed();
    const block = await ethers.provider.getBlock("latest");
    currentTime = block.timestamp;
    await market.whitelistToken(token.address, true)
    await market.whitelistToken(alice.address, true)

  });
  it("should fail to list", async () => {
    /*await expect(market.listItem(0, 100, tokenId, token.address)).revertedWith(
      "ERC721: owner query for nonexistent token"
    );*/
    await nft.safemint(owner.address, tokenId);
    await market.safemint(owner.address, tokenId);
    await expect(
      market.listItem(currentTime + twoWeeks + 100, 100, [tokenId], token.address)
    ).revertedWith("Market: auction too long");
    await expect(
      market.connect(alice).listItem(0, 100, [tokenId], token.address)
    ).revertedWith("ERC721: transfer of token that is not own");
	await expect(market.listItem(0, 100, [tokenId], bob.address)).revertedWith(
		"Market: token not whitelisted"
	  );
	await market.pause()
	await expect(market.listItem(0, 100, [tokenId], token.address)).revertedWith(
		"Pausable: paused"
	  );
  });
  it("should fail to bid", async () => {
    await nft.safemint(owner.address, tokenId);
    await market.safemint(owner.address, tokenId);
    await market.listItem(currentTime + twoWeeks, 100, [tokenId], token.address);
	await expect(market.connect(alice).bid(2, 100)).revertedWith(
		"Market: Non existing bid"
	  );
    await expect(market.connect(alice).bid(0, 50)).revertedWith(
      "Market: bid under min price"
    );
    await expect(market.connect(alice).bid(0, 100)).revertedWith(
      "ERC20: transfer amount exceeds balance"
    );
    await token.mint(alice.address, 150);
    await token.connect(alice).approve(market.address, 150);
    await market.connect(alice).bid(0, 150);
    await expect(market.connect(alice).bid(0, 100)).revertedWith(
      "Market: bid under highest bid"
    );
    await increaseTime(twoWeeks + 1);
    await expect(market.connect(alice).bid(0, 155)).revertedWith(
      "Market: auction ended"
    );
  await nft.safemint(owner.address, 2);
	await market.safemint(owner.address, 2);
	await market.listItem(0, 100, [2], alice.address);
	await expect(market.bid(1, 155, {value: 154})).revertedWith(
		"Market: Mismatch"
	  );
  });
  it("should fail to settle", async () => {
    await nft.safemint(owner.address, tokenId);
    await market.safemint(owner.address, tokenId);
    await market.listItem(currentTime + twoWeeks, 100, [tokenId], token.address);
    await token.mint(alice.address, 150);
    await token.connect(alice).approve(market.address, 150);
    await market.connect(alice).bid(0, 150);
    await expect(market.connect(alice).settle(0)).revertedWith(
      "Market: auction not ended"
    );
    await increaseTime(twoWeeks + 1);
    await expect(market.connect(bob).settle(0)).revertedWith(
      "Market: not bidder or seller"
    );
  });
});

describe("ZoombiesMarketplace - valid actions", () => {
  let market: ZoombiesMarketPlace,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
	  charlie: SignerWithAddress,
    owner: SignerWithAddress,
    currentTime: any,
    token: ZoomToken,
    nft: ZoombiesNFT,
	  wXMovr: WrappedMovr;
  const tokenIds = [11, 12, 13, 14, 15];
  const oneDay = 86400;
  const NULL_ADDRESS = `0x${"0".repeat(40)}`;

  beforeEach(async () => {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    const nftFactory = await getContractFactory("ZoombiesMarketPlace", owner);
    const tokenFactory = await getContractFactory("ZoomToken", owner);
    const nftTokenFactory = await getContractFactory("ZoombiesNFT", owner);
	const wXMovrFactory = await getContractFactory("WrappedMovr", owner);

  wXMovr = await wXMovrFactory.deploy();
	await wXMovr.deployed()
  token = await tokenFactory.deploy();
  nft = await nftTokenFactory.deploy("multiple_test", "multiple_test");
    market = await nftFactory.deploy("multiple_test", "multiple_test", wXMovr.address, nft.address);
    await nft.setApprovalForAll(market.address, true);
    await nft.connect(alice).setApprovalForAll(market.address, true);
    await nft.connect(bob).setApprovalForAll(market.address, true);
    await nft.connect(charlie).setApprovalForAll(market.address, true);

    for(let i = 0; i < tokenIds.length; i++){
      await nft.safemint(owner.address, tokenIds[i]);
    }

    await market.deployed();
    await token.deployed();

    for(let i = 0; i < tokenIds.length; i++){
      await market.safemint(owner.address, tokenIds[i]);
    }
    
    const block = await ethers.provider.getBlock("latest");
    currentTime = block.timestamp;
	await market.whitelistToken(token.address, true);
	await market.whitelistToken(wXMovr.address, true);
  await market.listItem(currentTime + oneDay, 100, tokenIds, token.address);
  });

  it("should bid auction style", async () => {
    await token.mint(owner.address, 100);
    await token.approve(market.address, 100);
    await market.bid(0, 100);

    const expectedItem = {
      auctionEnd: currentTime + oneDay,
      minPrice: 100,
      saleToken: token.address,
      seller: owner.address,
      highestBidder: owner.address,
      tokenIds: tokenIds,
      highestBid: 100,
    };
    await checkItem(market, 0, expectedItem);
    expect(await token.balanceOf(owner.address)).to.equal(
      0,
      "funds should have been taken"
    );
    expect(await token.balanceOf(market.address)).to.equal(
      100,
      "funds should be in market"
    );
  });
  it("should bid insta sell", async () => {
    await nft.safemint(alice.address, 2);
    await market.safemint(alice.address, 2);
    await token.mint(bob.address, 100);
    await token.connect(bob).approve(market.address, 100);

    await market.connect(alice).listItem(0, 100, [2], token.address);
    await market.connect(bob).bid(1, 100);
    const expectedItem = {
      auctionEnd: 0,
      minPrice: 0,
      saleToken: NULL_ADDRESS,
      seller: NULL_ADDRESS,
      highestBidder: NULL_ADDRESS,
      tokenIds: tokenIds,
      highestBid: 0,
    };
    await checkItem(market, 1, expectedItem);
    expect(await token.balanceOf(bob.address)).to.equal(
      0,
      "funds should have been taken"
    );
    expect(await token.balanceOf(market.address)).to.equal(
      0,
      "funds should have been taken"
    );

    expect(await token.balanceOf(alice.address)).to.equal(
      95,
      "funds should have been taken"
    );
    expect(await token.balanceOf(owner.address)).to.equal(
      5,
      "funds should have been taken"
    );
  });
  it("should bid twice auction style then settle and auction again maintain original seller", async () => {
    await token.mint(alice.address, 100);
    await token.connect(alice).approve(market.address, 100);
    await market.connect(alice).bid(0, 100);

    const expectedItem = {
      auctionEnd: currentTime + oneDay,
      minPrice: 100,
      saleToken: token.address,
      seller: owner.address,
      highestBidder: alice.address,
      tokenIds: tokenIds,
      highestBid: 100,
    };
    await checkItem(market, 0, expectedItem);
    expect(await token.balanceOf(market.address)).to.equal(
      100,
      "funds should have been sent"
    );

    expect(await token.balanceOf(alice.address)).to.equal(
      0,
      "funds should have been taken"
    );

    await token.mint(bob.address, 200);
    await token.connect(bob).approve(market.address, 200);
    await market.connect(bob).bid(0, 200);

    const expectedItem2 = {
      auctionEnd: currentTime + oneDay,
      minPrice: 100,
      saleToken: token.address,
      seller: owner.address,
      highestBidder: bob.address,
      tokenIds: tokenIds,
      highestBid: 200,
    };
    await checkItem(market, 0, expectedItem2);
    expect(await token.balanceOf(market.address)).to.equal(
      200,
      "funds should have been sent"
    );

    expect(await token.balanceOf(alice.address)).to.equal(
      100,
      "funds should have been returned"
    );
    expect(await token.balanceOf(bob.address)).to.equal(
      0,
      "funds should have been taken"
    );
	
    await increaseTime(oneDay + 1);
	await market.settle(0)

	expect(await token.balanceOf(owner.address)).to.equal(
		200,
		"funds should have been rewarded"
	  );
	await market.connect(bob).listItem(0, 100, tokenIds, token.address);
	  await token.mint(charlie.address, 100);
      await token.connect(charlie).approve(market.address, 100);

	  await market.connect(charlie).bid(1, 100);

	  expect(await token.balanceOf(owner.address)).to.equal(
		210,
		"funds should have been rewarded"
	  );

  });
  
});
