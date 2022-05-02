import Head from "next/head";
import { useEffect, useState } from "react";
import { JsonRpcSigner, Web3Provider } from "@ethersproject/providers";
import { ethers } from "ethers";
import { Lottery, Lottery__factory } from "../../typechain";
import { Button, Stack, Heading, Text, Box, Card } from "degen";
import styles from "../styles/index.module.css";

declare let window: {
  ethereum: ethers.providers.ExternalProvider;
};

interface LotteryHistory {
  [key: number]: string;
}

interface ProviderRpcError {
  message: string;
  code: number;
  data?: unknown;
}

export default function Home() {
  const [contractOwner, setContractOwner] = useState<string>("");
  const [provider, setProvider] = useState<Web3Provider>();
  const [contract, setContract] = useState<Lottery>();
  const [signer, setSigner] = useState<JsonRpcSigner>();
  const [address, setAddress] = useState<string>();
  const [players, setPlayers] = useState<string[]>([]);
  const [pot, setPot] = useState<string>("0");
  const [lotteryHistory, setLotteryHistory] = useState<LotteryHistory[]>([]);
  const [randomResult, setRandomResult] = useState<string>("0x00");
  const [error, setError] = useState<string>();

  const handleConnectWallet = async () => {
    if (
      typeof window !== "undefined" &&
      typeof window.ethereum !== "undefined" &&
      provider
    ) {
      try {
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const currentAddress = await signer.getAddress();

        setSigner(signer);
        setAddress(currentAddress);
      } catch (error) {
        if (error instanceof Error) setError(error.message);
      }
    } else {
      alert("Please install MetaMask https://metamask.io/");
    }
  };

  const handleDisconnectWallet = () => setAddress(undefined);

  const handlePlayNow = async () => {
    try {
      if (provider && contract && signer) {
        const contractWithSigner = contract.connect(signer);
        const tx = await contractWithSigner.enter({
          value: ethers.utils.parseEther("0.1"),
        });
        await tx.wait();
        updateLotteryState();
      }
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handlePickWinner = async () => {
    try {
      if (provider && contract && signer) {
        const accounts = await provider.send("eth_requestAccounts", []);
        if (contractOwner !== accounts[0])
          throw new Error("Only owner can invoke this.");
        const signer = provider.getSigner();
        const contractWithSigner = contract.connect(signer);
        const tx = await contractWithSigner.pickWinner();
        await tx.wait();
        updateLotteryState();
      }
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handlePayWinner = async () => {
    try {
      if (provider && contract) {
        const accounts = await provider.send("eth_requestAccounts", []);
        if (contractOwner !== accounts[0])
          throw new Error("Only owner can invoke this.");
        const signer = provider.getSigner();
        const contractWithSigner = contract.connect(signer);
        const tx = await contractWithSigner.payWinner();
        await tx.wait();
        updateLotteryState();
      }
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const getContractOwner = async () => {
    if (contract) {
      const owner = await contract.owner();
      setContractOwner(owner.toLowerCase());
    }
  };

  const getRandomResult = async () => {
    if (contract) {
      const randomResult = await contract.getRandomResult();
      setRandomResult(randomResult.toHexString());
    }
  };

  const getPlayers = async () => {
    if (contract) {
      const players = await contract.getPlayers();
      setPlayers(players);
    }
  };

  const getPot = async () => {
    if (contract) {
      const pot = await contract.getBalance();
      setPot(ethers.utils.formatEther(pot));
    }
  };

  const getLotteryHistory = async () => {
    if (contract) {
      const history = [];
      let lotteryId = (await contract.lotteryId()).toNumber();
      while (lotteryId > 0) {
        const lotteryIdWinner = await contract.lotteryHistory(lotteryId);
        history.push({
          [lotteryId]: lotteryIdWinner.includes("0x0")
            ? "Current Game"
            : lotteryIdWinner,
        });
        lotteryId--;
      }
      setLotteryHistory(history);
    }
  };

  const updateLotteryState = () => {
    getPlayers();
    getPot();
    getLotteryHistory();
    getRandomResult();
    getContractOwner();
  };

  useEffect(() => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = Lottery__factory.connect(
      process.env.NEXT_PUBLIC_LOTTERY_CONTRACT_ADDRESS as string,
      provider
    );

    setProvider(provider);
    setContract(contract);
  }, []);

  useEffect(() => {
    updateLotteryState();
  }, [provider, contract]);

  return (
    <div>
      <Head>
        <title>Lottery Dapp</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <nav className={styles.nav}>
        <Stack direction="horizontal" justify="space-between" align="center">
          <Heading as="h1" level="1">
            Next Lottery Dapp
          </Heading>
          <Stack align="center">
            <Button
              variant="tertiary"
              width={{ xs: "full", md: "max" }}
              onClick={address ? handleDisconnectWallet : handleConnectWallet}
            >
              {address ? "Logout" : "Connect"}
            </Button>
          </Stack>
        </Stack>
      </nav>
      <main className={styles.main}>
        <section>
          <Stack direction="horizontal" justify="space-between" wrap>
            <Box>
              <Card>
                <Heading as="h3">Pot</Heading>
                <Text as="p">{`${pot} Ether`}</Text>
              </Card>
            </Box>
            <Box>
              <Card>
                <Heading as="h3">{`Players (${players.length})`}</Heading>
                <Text as="p">
                  {players && players.length > 0
                    ? players.map((player, i) => {
                        return (
                          <li key={`${player}-${i}`}>
                            <a
                              href={`https://etherscan.io/address/${player}`}
                              target="_blank"
                            >
                              {player}
                            </a>
                          </li>
                        );
                      })
                    : "No current players."}
                </Text>
              </Card>
            </Box>
            <Box>
              <Card>
                <Heading as="h3">Previous Winners</Heading>
                <Text as="p">
                  {lotteryHistory.map((history) => {
                    for (const [lotteryId, player] of Object.entries(history)) {
                      return (
                        <li
                          key={`${lotteryId}${player}`}
                          className={styles.historyItem}
                        >
                          {lotteryId}
                          {" - "}
                          {player === "Current Game" ? (
                            player
                          ) : (
                            <a
                              href={`https://etherscan.io/address/${player}`}
                              target="_blank"
                            >
                              {player}
                            </a>
                          )}
                        </li>
                      );
                    }
                  })}
                </Text>
              </Card>
            </Box>
          </Stack>
        </section>
        <section className={styles.buttons}>
          <Stack
            direction="vertical"
            justify="space-between"
            align="flex-start"
          >
            <Card>
              <Text as="p">Enter the lottery by sending 0.01 Ether.</Text>
              <Button
                variant="secondary"
                tone="red"
                size="small"
                onClick={handlePlayNow}
                disabled={!address || randomResult !== "0x00"}
              >
                Play Now
              </Button>
            </Card>
            <Card>
              <Text as="p">
                <b>Admin:</b> Pick winner
              </Text>
              <Button
                variant="secondary"
                size="small"
                onClick={handlePickWinner}
                disabled={
                  !address || players.length <= 1 || randomResult !== "0x00"
                }
              >
                Pick Winner
              </Button>
            </Card>
            <Card>
              <Text as="p">
                <b>Admin:</b> Pay winner
              </Text>
              <Button
                variant="secondary"
                tone="green"
                size="small"
                onClick={handlePayWinner}
                disabled={!address || randomResult === "0x00"}
              >
                Pay Winner
              </Button>
            </Card>
          </Stack>
        </section>
      </main>
    </div>
  );
}
