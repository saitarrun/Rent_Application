// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RENT - Minimal on-chain lease management with direct owner payouts.
contract RENT {
    struct Lease {
        uint256 id;
        address owner;
        address tenant;
        uint256 rentWei;
        uint256 depositWei;
        uint256 startUnix;
        uint256 endUnix;
        bool active;
    }

    uint256 public nextLeaseId;
    mapping(uint256 => Lease) public leases;

    event LeaseCreated(uint256 indexed id, address indexed tenant, address indexed owner);
    event LeaseSigned(uint256 indexed id, address tenant);
    event DepositPaid(uint256 indexed id, uint256 amount, uint256 time);
    event AnnualRentPaid(uint256 indexed id, uint256 amount, uint256 time);
    event RepairRequested(uint256 indexed id, bytes32 reqId, string title, uint256 cost);
    event RepairUpdated(uint256 indexed id, bytes32 reqId, string status);

    function createLease(
        address tenant,
        uint256 rentWei,
        uint256 depositWei,
        uint256 startUnix,
        uint256 endUnix
    ) external returns (uint256 leaseId) {
        require(tenant != address(0), "Tenant required");
        require(rentWei > 0 && depositWei > 0, "Invalid amounts");
        require(endUnix > startUnix, "Invalid schedule");

        leaseId = nextLeaseId++;
        leases[leaseId] = Lease({
            id: leaseId,
            owner: msg.sender,
            tenant: tenant,
            rentWei: rentWei,
            depositWei: depositWei,
            startUnix: startUnix,
            endUnix: endUnix,
            active: false
        });

        emit LeaseCreated(leaseId, tenant, msg.sender);
    }

    function signLease(uint256 leaseId) external {
        Lease storage lease = leases[leaseId];
        require(lease.tenant == msg.sender, "Not tenant");
        emit LeaseSigned(leaseId, msg.sender);
    }

    function payDeposit(uint256 leaseId) external payable {
        Lease storage lease = leases[leaseId];
        require(lease.tenant == msg.sender, "Not tenant");
        require(msg.value == lease.depositWei, "Incorrect amount");
        _forward(lease.owner, msg.value);
        emit DepositPaid(leaseId, msg.value, block.timestamp);
    }

    function payAnnualRent(uint256 leaseId) external payable {
        Lease storage lease = leases[leaseId];
        require(lease.tenant == msg.sender, "Not tenant");
        require(msg.value == lease.rentWei, "Incorrect amount");
        if (!lease.active) {
            lease.active = true;
        }
        _forward(lease.owner, msg.value);
        emit AnnualRentPaid(leaseId, msg.value, block.timestamp);
    }

    function requestRepair(uint256 leaseId, string calldata title, uint256 cost) external returns (bytes32 reqId) {
        Lease storage lease = leases[leaseId];
        require(lease.tenant == msg.sender, "Not tenant");
        reqId = keccak256(abi.encodePacked(block.timestamp, leaseId, msg.sender, title));
        emit RepairRequested(leaseId, reqId, title, cost);
    }

    function setRepairStatus(uint256 leaseId, bytes32 reqId, string calldata status) external {
        Lease storage lease = leases[leaseId];
        require(lease.owner == msg.sender, "Not owner");
        emit RepairUpdated(leaseId, reqId, status);
    }

    function getLease(uint256 leaseId) external view returns (Lease memory) {
        return leases[leaseId];
    }

    function _forward(address to, uint256 amount) internal {
        (bool sent, ) = payable(to).call{value: amount}("");
        require(sent, "Transfer failed");
    }
}
