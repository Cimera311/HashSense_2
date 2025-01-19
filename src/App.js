import MinerCard from "./components/MinerCard.js";
import MinerList from "./components/MinerList.js";

let miners = []; // Global state for miners
let modalVisible = false; // Global state for modal visibility
let editingMinerIndex = null; // Tracks the miner being edited (null for new miners)

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
      MinerCard(container, miners, showModal, editMiner, deleteMiner, copyMiner);
    } else {
      MinerList(container, miners, showModal, editMiner, deleteMiner, copyMiner);
    }

    renderModal(container);
  };

  const switchView = (view) => {
    currentView = view;
    render();
  };

  const addMiner = (newMiner) => {
    if (editingMinerIndex !== null) {
      miners[editingMinerIndex] = newMiner;
      editingMinerIndex = null;
    } else {
      miners.push(newMiner);
    }
    modalVisible = false;
    render();
  };

  const deleteMiner = (index) => {
    miners.splice(index, 1);
    render();
  };

  const editMiner = (index) => {
    editingMinerIndex = index;
    showModal(miners[index]);
  };

  const copyMiner = (index) => {
    const minerToCopy = miners[index];
    const existingNumbers = miners.map(m => parseInt(m.name.match(/#(\d+)/)?.[1] || 0, 10));
    const newNumber = Math.max(...existingNumbers, 0) + 1;
    const copiedMiner = {
      ...minerToCopy,
      name: `#${newNumber.toString().padStart(4, '0')}`,
    };
    miners.push(copiedMiner);
    render();
  };

  const showModal = (miner = { name: "", hashrate: 0, efficiency: 0 }) => {
    modalVisible = true;
    render();
    populateModal(miner);
  };

  const closeModal = () => {
    modalVisible = false;
    render();
  };

  const populateModal = (miner) => {
    document.getElementById("miner-name").value = miner.name || "";
    document.getElementById("miner-hashrate").value = miner.hashrate || 0;
    document.getElementById("miner-efficiency").value = miner.efficiency || 0;
  };

  const renderModal = (container) => {
    if (!modalVisible) return;

    const modal = document.createElement("div");
    modal.className = "modal";

    modal.innerHTML = `
      <div class="modal-content">
        <h3>${editingMinerIndex !== null ? "Miner bearbeiten" : "Neuer Miner"}</h3>
        <label>Name:</label>
        <input type="text" id="miner-name" value="#0001" />
        <label>Hashrate (H/s):</label>
        <input type="number" id="miner-hashrate" value="1" />
        <label>Effizienz (%):</label>
        <input type="number" id="miner-efficiency" value="20" />
        <div class="modal-actions">
          <button id="save-miner">Speichern</button>
          <button id="cancel-miner">Abbrechen</button>
        </div>
      </div>
    `;

    modal.querySelector("#save-miner").onclick = () => {
      const name = document.getElementById("miner-name").value;
      const hashrate = parseFloat(document.getElementById("miner-hashrate").value);
      const efficiency = parseFloat(document.getElementById("miner-efficiency").value);
      addMiner({ name, hashrate, efficiency });
    };

    modal.querySelector("#cancel-miner").onclick = closeModal;
    container.appendChild(modal);
  };

  render();
};

export default App;
