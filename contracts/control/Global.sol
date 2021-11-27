//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Global is AccessControl, Pausable {

	uint256 public creatorFee;
    uint256 public zoombiesFee;
    address public dollarZoombies;
    uint256 public maxAuctionTime;
    uint256 private constant UPPERBOUNDFEE = 20;
    uint256 private constant LOWERBOUNDFEE = 0;
    uint256 public maxNFTCount;

	mapping (address => bool) public tokenWhitelist;

	modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "ZoombiesNFT: User does not have admin role"
        );
        _;
    }

	constructor() {
		zoombiesFee = 5;
        creatorFee = 5;
        dollarZoombies = msg.sender;
        maxAuctionTime = 2 weeks;
        maxNFTCount = 255;
        // Roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(DEFAULT_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
    }

	function pause() public onlyAdmin {
		_pause();
	}

	function unpause() public onlyAdmin {
		_unpause();
	}

	function whitelistToken(address token, bool isWhitelisted) public onlyAdmin {
		tokenWhitelist[token] = isWhitelisted;
	}

	function changeDollarZoombiesAddress(address _dollarZoombies) external onlyAdmin {
        dollarZoombies = _dollarZoombies;
    }

    function changeMaxNFTCount(uint256 _maxNFTCount) external onlyAdmin {
        require(
            _maxNFTCount >= 1,
            "invalid MaxNFTCount"
        );
        maxNFTCount = _maxNFTCount;
    }

	function changeZoombiesFee(uint256 _zoombiesFee) external onlyAdmin {
        // can either be 0-20% StakerFee
        require(
            _zoombiesFee <= UPPERBOUNDFEE && _zoombiesFee >= LOWERBOUNDFEE,
            "not in bounds"
        );
        zoombiesFee = _zoombiesFee;
	}

	function changeCreatorFee(uint256 _creatorFee) external onlyAdmin {
        // can either be 0-20% StakerFee
        require(
            _creatorFee <= UPPERBOUNDFEE && _creatorFee >= LOWERBOUNDFEE,
            "not in bounds"
        );
        creatorFee = _creatorFee;
	}

	function changeMaxAuctionTime(uint256 _maxAuctionTime) external onlyAdmin {
        // can either be 0 or a month
        require(
            _maxAuctionTime <= 4 weeks && _maxAuctionTime >= 2 weeks,
            "not in bounds"
        );
        maxAuctionTime = _maxAuctionTime;
	}
}