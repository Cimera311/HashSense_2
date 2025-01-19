const MinerCard = (container, miners, onAdd, onEdit, onDelete, onCopy) => {
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "miner-cards";

  miners.forEach((miner, index) => {
    const card = document.createElement("div");
    card.className = "miner-card";

    card.innerHTML = `
      <div class="miner-card-header">${miner.name}</div>
      <div class="miner-card-row">
        <span>Hashrate:</span> <span>${miner.hashrate} H/s</span>
      </div>
      <div class="miner-card-row">
        <span>Effizienz:</span> <span>${miner.efficiency}%</span>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "actions";

    const editButton = document.createElement("button");
    editButton.textContent = "✎";
    editButton.onclick = () => onEdit(index);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "✖";
    deleteButton.onclick = () => onDelete(index);

    const copyButton = document.createElement("button");
    copyButton.textContent = "📋";
    copyButton.onclick = () => onCopy(index);

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    actions.appendChild(copyButton);

    card.appendChild(actions);
    cardsContainer.appendChild(card);
  });

const addCard = document.createElement("div");
  addCard.className = "miner-card miner-card-header";
  addCard.textContent = "+ Neuer Miner";
  addCard.onclick = onAdd;

  cardsContainer.appendChild(addCard);
  container.appendChild(cardsContainer);
};

export default MinerCard;
