//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./control/Global.sol";

contract ZoombiesNFT is ERC721URIStorage, ERC721Enumerable, Global {
    using SafeMath for uint256;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721URIStorage, ERC721)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function setTokenURI(uint256 tokenId, string memory _tokenURI)
        public
        onlyAdmin
        returns (bool)
    {
        _setTokenURI(tokenId, _tokenURI);
        return true;
    }

    function burn(uint256 tokenId) public onlyAdmin returns (bool) {
        _burn(tokenId);
        return true;
    }

    function safemint(address to, uint256 tokenId)
        public
        onlyAdmin
        returns (bool)
    {
        _safeMint(to, tokenId);
        return true;
    }

    function mint(address to, uint256 tokenId) public onlyAdmin returns (bool) {
        _mint(to, tokenId);
        return true;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        return super._beforeTokenTransfer(from, to, tokenId);
    }
    
    function _burn(uint256 tokenId)
        internal
        override(ERC721URIStorage, ERC721)
    {
        return super._burn(tokenId);
    }
}
