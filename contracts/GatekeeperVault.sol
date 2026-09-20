// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GatekeeperVault
 * @notice On-chain prize vault guarded by AI Gatekeeper EIP-712 authorizations.
 * @dev Enforces strict amount limits, testnet total payout hard cap, nonce replay protection,
 * and EIP-712 structured signatures.
 */
contract GatekeeperVault {
    // --- Constants ---
    uint256 public constant MAX_CLAIM_AMOUNT = 0.05 ether;
    uint256 public constant DEMO_MAX_TOTAL_PAYOUT = 0.5 ether;

    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 public constant CLAIM_AUTHORIZATION_TYPEHASH =
        keccak256("ClaimAuthorization(address recipient,uint256 amount,uint256 nonce,uint256 deadline)");

    bytes32 private immutable _NAME_HASH;
    bytes32 private immutable _VERSION_HASH;
    uint256 private immutable _DEPLOYED_CHAIN_ID;
    bytes32 private immutable _DEPLOYED_DOMAIN_SEPARATOR;

    // --- State Variables ---
    address public immutable gatekeeperSigner;
    uint256 public totalPaidOut;
    mapping(uint256 => bool) public isNonceUsed;

    bool private _reentrancyLocked;

    // --- Events ---
    event FundsReleased(address indexed recipient, uint256 amount, uint256 nonce);
    event VaultFunded(address indexed sender, uint256 amount);

    // --- Custom Errors ---
    error ZeroSignerAddress();
    error InvalidRecipient();
    error ZeroAmount();
    error ExceedsMaxClaimAmount(uint256 amount, uint256 maxAllowed);
    error ExceedsMaxTotalPayout(uint256 requestedTotal, uint256 maxTotal);
    error InsufficientVaultBalance(uint256 amount, uint256 balance);
    error NonceAlreadyUsed(uint256 nonce);
    error SignatureExpired(uint256 deadline, uint256 currentTimestamp);
    error InvalidSignature();
    error TransferFailed();
    error ReentrantCall();

    modifier nonReentrant() {
        if (_reentrancyLocked) revert ReentrantCall();
        _reentrancyLocked = true;
        _;
        _reentrancyLocked = false;
    }

    constructor(address _gatekeeperSigner) payable {
        if (_gatekeeperSigner == address(0)) revert ZeroSignerAddress();
        gatekeeperSigner = _gatekeeperSigner;

        _NAME_HASH = keccak256(bytes("AI Gatekeeper Vault"));
        _VERSION_HASH = keccak256(bytes("1"));
        _DEPLOYED_CHAIN_ID = block.chainid;
        _DEPLOYED_DOMAIN_SEPARATOR = _buildDomainSeparator();

        if (msg.value > 0) {
            emit VaultFunded(msg.sender, msg.value);
        }
    }

    /**
     * @notice Returns the EIP-712 domain separator.
     * @dev Dynamically recomputed if chainId changes (e.g. hard fork), otherwise returns cached value.
     */
    function domainSeparator() public view returns (bytes32) {
        if (block.chainid == _DEPLOYED_CHAIN_ID) {
            return _DEPLOYED_DOMAIN_SEPARATOR;
        }
        return _buildDomainSeparator();
    }

    function _buildDomainSeparator() private view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                _NAME_HASH,
                _VERSION_HASH,
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Releases bounty funds to recipient upon valid Gatekeeper EIP-712 authorization.
     * @param recipient The address receiving the payout
     * @param amount The bounty amount in wei (must be <= MAX_CLAIM_AMOUNT)
     * @param nonce Unique authorization nonce to prevent replays
     * @param deadline Unix timestamp after which signature expires
     * @param v ECDSA recovery id
     * @param r ECDSA signature output r
     * @param s ECDSA signature output s
     */
    function claim(
        address recipient,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert ZeroAmount();
        if (amount > MAX_CLAIM_AMOUNT) revert ExceedsMaxClaimAmount(amount, MAX_CLAIM_AMOUNT);
        if (totalPaidOut + amount > DEMO_MAX_TOTAL_PAYOUT) {
            revert ExceedsMaxTotalPayout(totalPaidOut + amount, DEMO_MAX_TOTAL_PAYOUT);
        }
        if (amount > address(this).balance) {
            revert InsufficientVaultBalance(amount, address(this).balance);
        }
        if (block.timestamp > deadline) {
            revert SignatureExpired(deadline, block.timestamp);
        }
        if (isNonceUsed[nonce]) {
            revert NonceAlreadyUsed(nonce);
        }

        // Verify EIP-712 Signature
        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_AUTHORIZATION_TYPEHASH,
                recipient,
                amount,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                domainSeparator(),
                structHash
            )
        );

        address recoveredSigner = ecrecover(digest, v, r, s);
        if (recoveredSigner == address(0) || recoveredSigner != gatekeeperSigner) {
            revert InvalidSignature();
        }

        // Mark nonce as used
        isNonceUsed[nonce] = true;
        totalPaidOut += amount;

        emit FundsReleased(recipient, amount, nonce);

        // Safe ETH transfer
        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Deposit funds into the vault.
     */
    function deposit() external payable {
        if (msg.value > 0) {
            emit VaultFunded(msg.sender, msg.value);
        }
    }

    receive() external payable {
        if (msg.value > 0) {
            emit VaultFunded(msg.sender, msg.value);
        }
    }
}
