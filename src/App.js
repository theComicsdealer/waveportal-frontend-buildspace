import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import './App.css';
import abi from './utils/WavePortal.json';
import Loader from "react-loader-spinner";
import ReactTooltip from 'react-tooltip';


export default function App() {

	/*
	* Just a state variable we use to store our user's public wallet.
	*/
  	const [currentAccount, setCurrentAccount] = useState("");
	const [totalWaves, setTotalWaves] = useState(0);
	const [loading, setLoading] = useState(false);
	const [msg, setMsg] = useState("Leave your message here");
	const [waves, setWaves] = useState([]);
	
	const contractAddress = '0x2c8E29586a2E1159cEB2a6FA3CCB4d4C67e65145';
	const contractABI = abi.abi;
  
  	const checkIfWalletIsConnected = async () => {
		try {
			const { ethereum } = window;
			
			if (!ethereum) {
				console.log("Make sure you have metamask!");
				return;
			} else {
				console.log("We have the ethereum object", ethereum);
			}
			
			/*
			* Check if we're authorized to access the user's wallet
			*/
			const accounts = await ethereum.request({ method: 'eth_accounts' });
			
			if (accounts.length !== 0) {
				const account = accounts[0];
				console.log("Found an authorized account:", account);
				setCurrentAccount(account)

				await getTotalWaves();
				await getWaves();
			} else {
				console.log("No authorized account found")
			}
		} catch (error) {
			console.log(error);
		}
  	}

	const subscribeToWaveEvents = async () => {
		try {
			const wavePortalContract = getWavePortal();

			if (wavePortalContract !== null) {
				const onNewWave = async (from, timestamp, message) => {
					console.log('NewWave', from, timestamp, message);
					setWaves(prevState => [
					  	...prevState,
						{	
							address: from,
							timestamp: new Date(timestamp * 1000),
							message: message,
					  	},
					]);

					await getTotalWaves();
				};

				wavePortalContract.on('NewWave', onNewWave);

				return () => {
					if (wavePortalContract) {
						wavePortalContract.off('NewWave', onNewWave);
					}
				};
			}
		} catch (error) {
			console.log(error);
		}
  
	}

	/*
	* Implement your connectWallet method here
	*/
	const connectWallet = async () => {
		try {
			const { ethereum } = window;
		
			if (!ethereum) {
				alert("Get MetaMask!");
				return;
			}
		
			const accounts = await ethereum.request({ method: "eth_requestAccounts" });
		
			console.log("Connected", accounts[0]);
			setCurrentAccount(accounts[0]);

		} catch (error) {
		  	console.log(error)
		}
	}

	const handleChange = (e) => {
		setMsg(e.target.value)
	}
  
	useEffect(() => {
		checkIfWalletIsConnected();
		subscribeToWaveEvents();
	}, [])

	const wave = async () => {
		try {
			const wavePortalContract = getWavePortal();

			if (wavePortalContract !== null) {
				setLoading(true);
				
				/*
				* Execute the actual wave from your smart contract
				*/
				const waveTxn = await wavePortalContract.wave(msg, { gasLimit: 300000 });
				console.log("Mining...", waveTxn.hash);
		
				await waveTxn.wait();
				console.log("Mined -- ", waveTxn.hash);
				
				await getTotalWaves();

				setLoading(false);
			}
		} catch (error) {
			console.log(error)
		}
	}

	const getWavePortal = () => {
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
				return wavePortalContract;
			} else {
			  	console.log("Ethereum object doesn't exist!")
			}
		} catch (error) {
			console.log(error);
		}

		return null;
	}

	const getWaves = async () => {
		try {
			const wavePortalContract = getWavePortal();

			if(wavePortalContract !== null){
				/*
				* Call the getAllWaves method from your Smart Contract
				*/
				const allWaves = await wavePortalContract.getWavesList();
				
		
				/*
				* We only need address, timestamp, and message in our UI so let's
				* pick those out
				*/
				let wavesCleaned = [];
				allWaves.forEach(wave => {
					wavesCleaned.push({
						address: wave.addr,
						timestamp: new Date(wave.timestamp * 1000),
						message: wave.msg
					});
				});
		
				/*
				* Store our data in React State
				*/
				setWaves(wavesCleaned);
			}
			
		} catch (error) {
			console.log(error);
		}
	}

	const getTotalWaves = async () => {
		try {
			const wavePortalContract = getWavePortal();

			if(wavePortalContract !== null) {
				/*
				* Call the getTotalWaves method from your Smart Contract
				*/
				const count = await wavePortalContract.getTotalWaves();
				console.log("Retrieved total wave count...", count.toNumber());
				setTotalWaves(count.toNumber());
			}
		} catch (error) {
			console.log(error);
		}
	}

	const truncateAddress = (addr) => {
		return `${addr.substr(0, 4)}...${addr.substr(addr.length-4)}`;
	}
  
	return (
		<div className="mainContainer">

			<div className="dataContainer">
				<div className="header">
					<span role="img" aria-label="Wave emoji">👋</span> Hey there!
				</div>

				<div className="bio">
					I am florent and I run Kryptonite.africa from Cotonou Benin! Connect your Ethereum wallet and wave at me!
				</div>

				<textarea className="msgArea" value={msg} onChange={handleChange}></textarea>

				<button disabled={loading} className="waveButton" onClick={wave}>
					{
						loading ? 
							<Loader
								type="ThreeDots"
								color="black"
								height={28}
								width={28}
								visible={true}
							/>
							:
							<span>Wave at Me</span>
						
					}
				</button>

				{/*
				* If there is no currentAccount render this button
				*/}
				{!currentAccount && (
					<button className="waveButton" onClick={connectWallet}>
						Connect Wallet
					</button>
				)}

				<div className="header2">
					<span role="img" aria-label="Checkbox emoji">✅</span> Total waves so far: {totalWaves}
				</div>

				<div className="header2">
					<span role="img" aria-label="Inbox emoji">📥</span> Waves log:
				</div>
				
				<table style={{ marginTop: "24px", color: "gray" }}>
					<thead>
						<tr>
							<th style={{ width: "15%", textAlign: "left" }}>Address</th>
							<th style={{ width: "auto", textAlign: "center" }}>Message</th>
							<th style={{ width: "25%", textAlign: "right" }}>Date</th>
						</tr>
					</thead>
					<tbody>
						{waves && (
							waves.slice(0).reverse().map((wave, index) => <tr key={index} className="logs">
									<td style={{ textAlign: "left" }} data-tip={wave.address} >
										{truncateAddress(wave.address)} 
										<ReactTooltip place="bottom" effect="solid" />
									</td>
									<td style={{ textAlign: "center" }}>{wave.message}</td>
									<td style={{ textAlign: "right" }}>
										{wave.timestamp.getDate()}/
										{wave.timestamp.getMonth()+1}/
										{wave.timestamp.getFullYear()}&nbsp;
										{wave.timestamp.getHours()}:
										{wave.timestamp.getMinutes()}:
										{wave.timestamp.getSeconds()}
									</td>
								</tr>
							)
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
