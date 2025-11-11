// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILeaseRegistry {
    function leaseTenant(uint256 leaseId) external view returns (address);
    function leaseOwner(uint256 leaseId) external view returns (address);
}

/// @title Payments - Accepts rent in ETH from whitelisted tenants per lease.
contract Payments {
    address public owner;
    ILeaseRegistry public registry;

    event RentPaid(
        uint256 indexed leaseId,
        address indexed tenant,
        uint256 periodStart,
        uint256 periodEnd,
        uint256 amountWei,
        uint256 paidAt
    );

    constructor(address registryAddress) {
        owner = msg.sender;
        registry = ILeaseRegistry(registryAddress);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyTenant(uint256 leaseId) {
        require(msg.sender == registry.leaseTenant(leaseId), "Not the tenant");
        _;
    }

    function setRegistry(address registryAddress) external onlyOwner {
        require(registryAddress != address(0), "registry required");
        registry = ILeaseRegistry(registryAddress);
    }

    /// @notice Pay rent for a billing period. Validation for expected amount stays off-chain.
    function payRent(
        uint256 leaseId,
        uint256 periodStartUnix,
        uint256 periodEndUnix,
        uint256 expectedWei
    ) external payable onlyTenant(leaseId) {
        require(periodEndUnix > periodStartUnix, "Invalid period");
        require(msg.value == expectedWei, "Incorrect value");
        address ownerWallet = registry.leaseOwner(leaseId);
        require(ownerWallet != address(0), "Owner missing");

        emit RentPaid(leaseId, msg.sender, periodStartUnix, periodEndUnix, msg.value, block.timestamp);

        (bool sent, ) = payable(ownerWallet).call{value: msg.value}("");
        require(sent, "Owner transfer failed");
    }

    /// @notice Owner withdraws accumulated funds.
    function withdraw(address payable to, uint256 amountWei) external onlyOwner {
        require(to != address(0), "recipient required");
        require(amountWei <= address(this).balance, "insufficient balance");
        to.transfer(amountWei);
    }
}
