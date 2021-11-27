//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./ZoombiesNFT.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./mocks/WrappedMovr.sol";

contract ZoombiesMarketPlace is ZoombiesNFT, ERC721Holder, ReentrancyGuard {
    using SafeMath for uint256;
    mapping(uint256 => address) public originalOwner;
    
    WrappedMovr wrappedXMovr;
    ZoombiesNFT zoombiesNFT;

    event ItemListed(
        address indexed lister,
        uint256[] indexed tokenIds,
        address indexed saleToken,
        uint256 minPrice
    );
    event Bid(
        uint256 itemNumber,
        uint256 bidAmount,
        address indexed bidder,
        uint256[] indexed tokenIds
    );
    event Settled(
        uint256 itemNumber,
        uint256 bidAmount,
        address indexed winner,
        address indexed seller,
        uint256[] indexed tokenIds
    );
    struct Item {
        uint256 auctionEnd;
        uint256 minPrice;
        address saleToken;
        address seller;
        address highestBidder;
        uint256[] tokenIds;
        uint256 highestBid;
    }

    mapping(uint256 => Item) public Items;
    uint256 public itemCount; // amount of proposals

    //
    constructor(
        string memory name,
        string memory symbol,
        address payable xMovr,
        address payable xZoombies
    ) ZoombiesNFT(name, symbol) {
        wrappedXMovr = WrappedMovr(xMovr);
        zoombiesNFT = ZoombiesNFT(xZoombies);
    }

    fallback() external payable {}
    
    //pauable
    //whitelist sale tokens?
    // and max sale time and min sale time maybe
    function listItem(
        uint256 auctionEnd,
        uint256 minPrice,
        uint256[] memory tokenIds,
        address saleToken
    ) public payable nonReentrant whenNotPaused {
        _originalOwnerCheck(tokenIds, msg.sender);
        require(
            auctionEnd <= block.timestamp.add(maxAuctionTime),
            "Market: auction too long"
        );
		require(tokenWhitelist[saleToken], "Market: token not whitelisted");
        require(tokenIds.length > 0, "Market: select at least 1 token");
        require(tokenIds.length < maxNFTCount, "Market: token count exceeds max count");
        // If auction end is 0 the auction is a insta buy, if not it is an auction
        Items[itemCount] = Item(
            auctionEnd,
            minPrice,
            saleToken,
            msg.sender,
            address(0),
            tokenIds,
            0
        );

        itemCount++;
        for (uint i = 0; i < tokenIds.length; i ++ ) {
            zoombiesNFT.safeTransferFrom(msg.sender, address(this), tokenIds[i], "0x");
        }
        emit ItemListed(msg.sender, tokenIds, saleToken, minPrice);
    }

    // bid in any token
    // need pre approve of token
    function bid(uint256 itemNumber, uint256 bidAmount)
        public
        payable
        nonReentrant
    {
        require(msg.value == 0 || bidAmount == msg.value, "Market: Mismatch");
        require(
            address(0) != Items[itemNumber].seller,
            "Market: Non existing bid"
        );
        require(
            bidAmount >= Items[itemNumber].minPrice,
            "Market: bid under min price"
        );
        require(
            bidAmount >= Items[itemNumber].highestBid,
            "Market: bid under highest bid"
        );
        require(
            block.timestamp <= Items[itemNumber].auctionEnd ||
                Items[itemNumber].auctionEnd == 0,
            "Market: auction ended"
        );

        wrapXMovrOrTake(Items[itemNumber].saleToken, bidAmount);
        // if there is a bid send funds back
        if (Items[itemNumber].highestBidder != address(0)) {
            unWrapXMovrorSend(
                Items[itemNumber].highestBid,
                payable(Items[itemNumber].highestBidder),
                Items[itemNumber].saleToken
            );
        }

        Items[itemNumber].highestBid = bidAmount;
        Items[itemNumber].highestBidder = msg.sender;

        if (Items[itemNumber].auctionEnd == 0) {
            _doSettle(itemNumber);
        }

        emit Bid(itemNumber, bidAmount, msg.sender, Items[itemNumber].tokenIds);
    }

    // make sure owner has not transfered
    function settle(uint256 itemNumber) public nonReentrant {
        _doSettle(itemNumber);
    }

    function _doSettle(uint256 itemNumber) private {
        // make sure auction has ended and the min bid is met
        require(
            block.timestamp >= Items[itemNumber].auctionEnd,
            "Market: auction not ended"
        );
        // make sure that either the bidder or the seller calls this
        require(
            msg.sender == Items[itemNumber].highestBidder ||
                msg.sender == Items[itemNumber].seller,
            "Market: not bidder or seller"
        );

        // sale conditions not met return to owner
        if (Items[itemNumber].highestBid == 0) {
            // return to owner
            for ( uint i = 0; i < Items[itemNumber].tokenIds.length; i ++ ) {
                zoombiesNFT.safeTransferFrom(address(this), Items[itemNumber].seller, Items[itemNumber].tokenIds[i], "0x");
            }
            emit Settled(
                itemNumber,
                0,
                address(0),
                Items[itemNumber].seller,
                Items[itemNumber].tokenIds
            );
        } else {
            for ( uint i = 0; i < Items[itemNumber].tokenIds.length; i ++ ) {
                zoombiesNFT.safeTransferFrom(address(this), Items[itemNumber].highestBidder, Items[itemNumber].tokenIds[i], "0x");
            }
            _chargeFeeAndPayout(itemNumber);
            emit Settled(
                itemNumber,
                Items[itemNumber].highestBid,
                Items[itemNumber].highestBidder,
                Items[itemNumber].seller,
                Items[itemNumber].tokenIds
            );
        }
        // transfer funds out of contract
        delete Items[itemNumber];
    }

    function _chargeFeeAndPayout(uint256 itemNumber) private {
        uint256 zoombiesPayout = Items[itemNumber].highestBid.mul(zoombiesFee).div(100);
        uint256 creatorPayout = Items[itemNumber]
            .highestBid
            .mul(creatorFee)
            .div(100);
        uint256 sellerPayout = Items[itemNumber].highestBid.sub(zoombiesPayout).sub(
            creatorPayout
        );

        unWrapXMovrorSend(
            zoombiesPayout,
            payable(dollarZoombies),
            Items[itemNumber].saleToken
        );
        unWrapXMovrorSend(
            creatorPayout,
            payable(originalOwner[Items[itemNumber].tokenIds[0]]),
            Items[itemNumber].saleToken
        );
        unWrapXMovrorSend(
            sellerPayout,
            payable(Items[itemNumber].seller),
            Items[itemNumber].saleToken
        );
    }

    function _originalOwnerCheck(uint256[] memory tokenIds, address sender) private {
        for(uint i = 0; i < tokenIds.length; i ++ ) {
            if (originalOwner[tokenIds[i]] == address(0)) {
                originalOwner[tokenIds[i]] = sender;
            }
        }
    }

    function wrapXMovrOrTake(address token, uint256 amount) private {
        if (msg.value != 0 && token == address(wrappedXMovr)) {
            wrappedXMovr.deposit{value: msg.value}();
        } else {
            IERC20 ERC20Instance = IERC20(token);
            SafeERC20.safeTransferFrom(
                ERC20Instance,
                msg.sender,
                address(this),
                amount
            );
        }
    }

    function unWrapXMovrorSend(
        uint256 wad,
        address payable to,
        address token
    ) private {
        if (token == address(wrappedXMovr)) {
            wrappedXMovr.withdraw(wad);
            // use transfer over low level call since it mimics WXMovr contract
            to.transfer(wad);
        } else {
            IERC20 ERC20Instance = IERC20(token);
            SafeERC20.safeTransfer(ERC20Instance, to, wad);
        }
    }
}
