
const MinerList = (container, miners, onAdd, onEdit, onDelete) => {
  const table = document.createElement("table");
  table.className = "miner-list";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Name</th>
        <th>Hashrate</th>
        <th>Effizienz</th>
        <th>Bearbeiten</th>
        <th>Löschen</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");

  miners.forEach((miner, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${miner.name}</td>
      <td>${miner.hashrate}</td>
      <td>${miner.efficiency}%</td>
    `;

    const editCell = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.textContent = "✎";
    editButton.onclick = () => {
      const name = prompt("Name:", miner.name);
      const hashrate = prompt("Hashrate (H/s):", miner.hashrate);
      const efficiency = prompt("Effizienz (%):", miner.efficiency);

      onEdit(index, { name, hashrate: parseFloat(hashrate), efficiency: parseFloat(efficiency) });
    };
    editCell.appendChild(editButton);

    const deleteCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "✖";
    deleteButton.onclick = () => onDelete(index);
    deleteCell.appendChild(deleteButton);

    row.appendChild(editCell);
    row.appendChild(deleteCell);
    tbody.appendChild(row);
  });

  const addRow = document.createElement("tr");
  addRow.innerHTML = `
    <td colspan="5" style="text-align: center; cursor: pointer;">+ Neuer Miner hinzufügen</td>
  `;
  addRow.onclick = onAdd;

  tbody.appendChild(addRow);
  table.appendChild(tbody);
  container.appendChild(table);
};

export default MinerList;
