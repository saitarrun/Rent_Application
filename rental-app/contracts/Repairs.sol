// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILeaseDirectory {
    function leaseTenant(uint256 leaseId) external view returns (address);
    function agreements(uint256 leaseId)
        external
        view
        returns (address owner, address tenant, uint256 rentWei, uint256 startUnix, uint256 endUnix, bytes32 termsHash);
}

/// @title Repairs - Emits lifecycle events for repair requests per lease.
contract Repairs {
    struct RepairRequest {
        uint256 leaseId;
        address tenant;
        string title;
        string detail;
        string status;
    }

    ILeaseDirectory public directory;
    address public owner;
    uint256 public nextRequestId;

    mapping(uint256 => RepairRequest) public requests;

    event RepairOpened(uint256 indexed requestId, uint256 indexed leaseId, address indexed tenant, string title, string detail);
    event RepairUpdated(uint256 indexed requestId, uint256 indexed leaseId, string status);

    constructor(address directoryAddress) {
        directory = ILeaseDirectory(directoryAddress);
        owner = msg.sender;
    }

    modifier onlyLeaseTenant(uint256 leaseId) {
        require(msg.sender == directory.leaseTenant(leaseId), "Not lease tenant");
        _;
    }

    modifier onlyLeaseOwner(uint256 leaseId) {
        (address leaseOwner, , , , , ) = directory.agreements(leaseId);
        require(msg.sender == leaseOwner, "Not lease owner");
        _;
    }

    function openRequest(uint256 leaseId, string calldata title, string calldata detail) external onlyLeaseTenant(leaseId) {
        require(bytes(title).length > 0, "Title required");
        nextRequestId += 1;
        requests[nextRequestId] = RepairRequest({
            leaseId: leaseId,
            tenant: msg.sender,
            title: title,
            detail: detail,
            status: "open"
        });
        emit RepairOpened(nextRequestId, leaseId, msg.sender, title, detail);
    }

    function setStatus(uint256 leaseId, uint256 requestId, string calldata status) external onlyLeaseOwner(leaseId) {
        RepairRequest storage req = requests[requestId];
        require(req.leaseId == leaseId, "Lease mismatch");
        req.status = status;
        emit RepairUpdated(requestId, leaseId, status);
    }
}
