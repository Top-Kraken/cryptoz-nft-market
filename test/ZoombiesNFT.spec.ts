import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { ZoombiesNFT } from "../typechain";
import { getContractFactory } from "./utils";

chai.use(waffle.solidity);

describe("ZoombiesNFT - valid actions", () => {
  let token: ZoombiesNFT,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    owner: SignerWithAddress;

  const tokenId = 1;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    const nftFactory = await getContractFactory("ZoombiesNFT", owner);

    token = await nftFactory.deploy("test", "test");
    await token.deployed();
  });

  it("should mint set token uri then burn", async () => {
    const balanceOfAliceBefore = await token.balanceOf(alice.address);
    await expect(token.mint(alice.address, tokenId))
      .to.emit(token, "Transfer")
      .withArgs(ethers.constants.AddressZero, alice.address, tokenId);

    token.setTokenURI(tokenId, "test");

    expect(await token.tokenURI(tokenId)).equal(
      "test",
      "token uri should be test"
    );

    const balanceOfAliceAfter = await token.balanceOf(alice.address);

    expect(balanceOfAliceBefore).to.equal(
      0,
      "alice should have no tokens to start"
    );
    expect(balanceOfAliceAfter).to.equal(1, "alice should have gotten minted");

    await expect(token.burn(1))
      .to.emit(token, "Transfer")
      .withArgs(alice.address, ethers.constants.AddressZero, tokenId);

    expect(await token.balanceOf(alice.address)).equal(
      0,
      "alice should have no tokens left"
    );
  });

  it("should mint then send", async () => {
    await token.mint(bob.address, tokenId);
    await token.connect(bob).transferFrom(bob.address, alice.address, tokenId);
    expect(await token.balanceOf(alice.address)).to.equal(
      1,
      "alice should have token"
    );
    expect(await token.balanceOf(bob.address)).to.equal(
      0,
      "bob should not have token"
    );

    await token.connect(alice).approve(owner.address, tokenId);
    await token["safeTransferFrom(address,address,uint256)"](
      alice.address,
      bob.address,
      tokenId
    );

    expect(await token.balanceOf(alice.address)).to.equal(
      0,
      "alice should not have token"
    );
    expect(await token.balanceOf(bob.address)).to.equal(
      1,
      "bob should have token"
    );

    await token.mint(bob.address, 2);
    await token.connect(bob).approve(owner.address, tokenId);
    await token["safeTransferFrom(address,address,uint256)"](
      bob.address,
      alice.address,
      tokenId
    );

    expect(await token.balanceOf(alice.address)).to.equal(
      1,
      "alice should have token"
    );
    expect(await token.balanceOf(bob.address)).to.equal(
      1,
      "bob should have token"
    );
  });
});


describe("ZoombiesNFT - invalid actions", () => {
	let token: ZoombiesNFT,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    owner: SignerWithAddress;

  const tokenId = 1;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    const nftFactory = await getContractFactory("ZoombiesNFT", owner);

    token = await nftFactory.deploy("test", "test");
    await token.deployed();
  });

	it("should fail to transfer more than owned", async () => {
		await expect(token.connect(bob).transferFrom(bob.address, alice.address, tokenId)).revertedWith(
			"ERC721: operator query for nonexistent token",
		);

		await expect(token.connect(alice).mint(alice.address, tokenId)).revertedWith(
			"ZoombiesNFT: User does not have admin role",
		);
		await expect(token.connect(alice).burn(tokenId)).revertedWith("ZoombiesNFT: User does not have admin role");
	});

	it("should fail transfer and transfer from", async () => {
		// Breaks here, see https://github.com/nomiclabs/hardhat/issues/1227
		await expect(token.transferFrom(owner.address, alice.address, 1)).to.be.reverted;
		await expect(token.transferFrom(alice.address, bob.address, 1)).to.be.reverted;
	});

	it("should fail to set metadata from non admin", async () => {
		await token.mint(owner.address, tokenId);
		await expect(token.connect(alice).setTokenURI(tokenId, "test")).revertedWith(
			"ZoombiesNFT: User does not have admin role",
		);
	});
});
