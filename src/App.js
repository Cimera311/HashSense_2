
import MinerCard from "./components/MinerCard.js";
import MinerList from "./components/MinerList.js";

let miners = []; // Global state for miners

const App = (container) => {
  let currentView = "cards";

  const render = () => {
    container.innerHTML = ""; // Clear previous content

    const viewSwitch = document.createElement("div");
    viewSwitch.className = "view-switch";

    const cardsButton = document.createElement("button");
    cardsButton.textContent = "Kartenansicht";
    cardsButton.onclick = () => switchView("cards");

    const listButton = document.createElement("button");
    listButton.textContent = "Listenansicht";
    listButton.onclick = () => switchView("list");

    viewSwitch.appendChild(cardsButton);
    viewSwitch.appendChild(listButton);

    container.appendChild(viewSwitch);

    if (currentView === "cards") {
      MinerCard(container, miners, addMiner, editMiner, deleteMiner);
    } else {
      MinerList(container, miners, addMiner, editMiner, deleteMiner);
    }
  };

  const switchView = (view) => {
    currentView = view;
    render();
  };

  const addMiner = () => {
    const newMiner = { name: "Neuer Miner", hashrate: 0, efficiency: 0 };
    miners.push(newMiner);
    render();
  };

  const editMiner = (index, updatedMiner) => {
    miners[index] = { ...miners[index], ...updatedMiner };
    render();
  };

  const deleteMiner = (index) => {
    miners.splice(index, 1);
    render();
  };

  render();
};

export default App;
