//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ZoomToken is ERC20 {
    constructor() ERC20("ZoomToken", "ZOOM") {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
