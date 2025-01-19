const MinerCard = (container, miners, onAdd, onEdit, onDelete, onCopy) => {
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "miner-cards";

  miners.forEach((miner, index) => {
    const card = document.createElement("div");
    card.className = "miner-card";

    card.innerHTML = `
      <h3>${miner.name}</h3>
      <p>Hashrate: ${miner.hashrate} H/s</p>
      <p>Effizienz: ${miner.efficiency}%</p>
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
  addCard.className = "add-card";
  addCard.textContent = "+";
  addCard.onclick = onAdd;

  cardsContainer.appendChild(addCard);
  container.appendChild(cardsContainer);
};

export default MinerCard;
