// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RENT - Simple lease registry storing tenant binding for on-chain enforcement.
contract RENT {
    struct Agreement {
        address owner;
        address tenant;
        uint256 rentWei;
        uint256 startUnix;
        uint256 endUnix;
        bytes32 termsHash;
    }

    mapping(uint256 => Agreement) public agreements;
    mapping(uint256 => address) public leaseTenant;

    event AgreementCreated(
        uint256 indexed leaseId,
        address indexed owner,
        address indexed tenant,
        uint256 rentWei,
        uint256 startUnix,
        uint256 endUnix,
        bytes32 termsHash
    );

    /// @notice Creates an agreement mapping a lease id to its tenant wallet.
    /// @dev rent/terms hash are stored for auditing while calculations stay off-chain.
    function createAgreement(
        uint256 leaseId,
        address tenant,
        uint256 rentWei,
        uint256 startUnix,
        uint256 endUnix,
        bytes32 termsHash
    ) external {
        require(tenant != address(0), "Tenant required");
        require(leaseId != 0, "LeaseId required");
        Agreement storage ag = agreements[leaseId];
        require(ag.owner == address(0), "Lease exists");

        agreements[leaseId] = Agreement({
            owner: msg.sender,
            tenant: tenant,
            rentWei: rentWei,
            startUnix: startUnix,
            endUnix: endUnix,
            termsHash: termsHash
        });

        leaseTenant[leaseId] = tenant;
        emit AgreementCreated(leaseId, msg.sender, tenant, rentWei, startUnix, endUnix, termsHash);
    }

    /// @notice Returns the wallet that created the agreement for payout wiring.
    function leaseOwner(uint256 leaseId) external view returns (address) {
        return agreements[leaseId].owner;
    }
}
