import { useState, useEffect } from "react";
import jsPDF from "jspdf";

function App() {
  const [form, setForm] = useState({
    nome: "",
    numero: "",
    salarioBruto: "",
    regime: "1 titular",
    dependentes: 0,
    taxaSS: "",
    subsidioRefeicao: "",
    subsidioTipo: "cartao",
    outrosDescontos: "",
  });

  const [result, setResult] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [alert, setAlert] = useState({ msg: "", tipo: "" });

  useEffect(() => {
    const data = localStorage.getItem("historico");
    if (data) setHistorico(JSON.parse(data));
  }, []);

  useEffect(() => {
    localStorage.setItem("historico", JSON.stringify(historico));
  }, [historico]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const mostrarAlert = (msg, tipo) => {
    setAlert({ msg, tipo });
    setTimeout(() => setAlert({ msg: "", tipo: "" }), 3000);
  };

  const validarCampos = () => {
    if (!form.nome.trim()) { mostrarAlert("Preenche o campo Nome.", "erro"); return false; }
    if (!form.numero.trim()) { mostrarAlert("Preenche o campo Número.", "erro"); return false; }
    if (!form.salarioBruto || parseFloat(form.salarioBruto) <= 0) { mostrarAlert("Salário Bruto inválido.", "erro"); return false; }
    if (!form.taxaSS || parseFloat(form.taxaSS) < 0) { mostrarAlert("Taxa de Segurança Social inválida.", "erro"); return false; }
    if (!form.subsidioRefeicao || parseFloat(form.subsidioRefeicao) < 0) { mostrarAlert("Subsídio Refeição inválido.", "erro"); return false; }
    if (form.outrosDescontos && parseFloat(form.outrosDescontos) < 0) { mostrarAlert("Outros Descontos inválidos.", "erro"); return false; }
    if (form.dependentes < 0) { mostrarAlert("Número de dependentes inválido.", "erro"); return false; }
    return true;
  };

  const calcularIRS = (salario) => {
    let irs = 0;
    if (salario <= 1000) irs = salario * 0.11;
    else if (salario <= 2000) irs = 1000 * 0.11 + (salario - 1000) * 0.15;
    else irs = 1000 * 0.11 + 1000 * 0.15 + (salario - 2000) * 0.28;

    irs -= form.dependentes * 20;
    if (irs < 0) irs = 0;
    return irs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validarCampos()) return;

    const bruto = parseFloat(form.salarioBruto);
    const ss = (bruto * parseFloat(form.taxaSS)) / 100;
    const irs = calcularIRS(bruto);
    const outros = parseFloat(form.outrosDescontos) || 0;
    const subsidio = parseFloat(form.subsidioRefeicao) * 22;
    const liquido = bruto - ss - irs - outros + subsidio;
    const anual = liquido * 14;

    const novo = {
      ...form,
      bruto,
      ss,
      irs,
      outros,
      subsidio,
      liquido,
      anual,
      data: new Date().toLocaleString(),
    };

    setResult(novo);
    setHistorico([novo, ...historico]);
    mostrarAlert("Simulação realizada com sucesso!", "sucesso");
  };

  const gerarPDF = () => {
    if (!result) { mostrarAlert("Não há resultados para gerar PDF.", "erro"); return; }

    const doc = new jsPDF();
    doc.setFontSize(12);
    let y = 20;

    doc.text("=== Dados do Utilizador ===", 10, y);
    y += 6;
    doc.text(`Nome: ${result.nome}`, 10, y);
    y += 6;
    doc.text(`Número: ${result.numero}`, 10, y);
    y += 6;
    doc.text(`Regime: ${result.regime}`, 10, y);
    y += 6;
    doc.text(`Dependentes: ${result.dependentes}`, 10, y);
    y += 10;

    doc.text("=== Cálculos ===", 10, y);
    y += 6;
    const linhas = [
      ["Vencimento Bruto", result.bruto],
      ["IRS", -result.irs],
      ["Segurança Social", -result.ss],
      ["Outros Descontos", -result.outros],
      ["Subsídio Alimentação", result.subsidio],
      ["Líquido Mensal", result.liquido],
      ["Líquido Anual (14x)", result.anual],
    ];

    linhas.forEach(([desc, val]) => {
      doc.text(`${desc}: ${val.toFixed(2)} €`, 10, y);
      y += 6;
    });

    y += 6;
    doc.text("Fórmula: Líquido = Bruto - IRS - SS - Descontos + Subsídio Alimentação", 10, y);
    y += 6;
    doc.text("Simulação gerada automaticamente", 10, y);

    doc.save(`Simulacao_${result.nome}_${new Date().toISOString().split("T")[0]}.pdf`);
    mostrarAlert("PDF gerado com sucesso!", "sucesso");
  };

  return (
    <div style={{ maxWidth: "600px", margin: "20px auto", fontFamily: "Arial, sans-serif" }}>
      <h1>Simulador de Vencimento Líquido</h1>

      {/* Alerts profissionais com cores escuras */}
      {alert.msg && (
        <div style={{
          borderRadius: "6px",
          padding: "12px",
          marginBottom: "15px",
          border: "1px solid #000",
          boxShadow: "2px 2px 5px rgba(0,0,0,0.2)",
          background: alert.tipo === "sucesso" ? "#155724" : "#721c24",
          color: "#fff",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center"
        }}>
          <span style={{ marginRight: "8px", fontSize: "18px" }}>
            {alert.tipo === "sucesso" ? "✅" : "⚠️"}
          </span>
          <span>{alert.msg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Campos espaçados */}
        {[
          { label: "Nome", name: "nome" },
          { label: "Número", name: "numero" },
          { label: "Salário Bruto (€)", name: "salarioBruto", type: "number" },
          { label: "Nº de Dependentes", name: "dependentes", type: "number" },
          { label: "Taxa Segurança Social (%)", name: "taxaSS", type: "number" },
          { label: "Subsídio Refeição (€ por dia)", name: "subsidioRefeicao", type: "number" },
          { label: "Outros Descontos (€)", name: "outrosDescontos", type: "number" },
        ].map(field => (
          <div key={field.name} style={{ marginBottom: "10px" }}>
            <label>{field.label}: </label><br />
            <input
              name={field.name}
              type={field.type || "text"}
              value={form[field.name]}
              onChange={handleChange}
            />
          </div>
        ))}

        <div style={{ marginBottom: "10px" }}>
          <label>Regime: </label><br />
          <select name="regime" value={form.regime} onChange={handleChange}>
            <option value="1 titular">1 titular</option>
            <option value="2 titulares">2 titulares</option>
          </select>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Tipo de Subsídio: </label><br />
          <select name="subsidioTipo" value={form.subsidioTipo} onChange={handleChange}>
            <option value="cartao">Cartão</option>
            <option value="dinheiro">Dinheiro</option>
          </select>
        </div>

        <div style={{ marginTop: "10px" }}>
          <button type="submit">Calcular</button>
        </div>
      </form>

      {/* Resultado em tabela */}
      {result && (
        <div style={{ border: "1px solid #000", padding: "10px", marginTop: "20px" }}>
          <h2>Resultado</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Vencimento Bruto", result.bruto],
                ["IRS", -result.irs],
                ["Segurança Social", -result.ss],
                ["Outros Descontos", -result.outros],
                ["Subsídio Alimentação", result.subsidio],
                ["Líquido Mensal", result.liquido],
                ["Líquido Anual (14x)", result.anual],
                ["Regime", result.regime],
                ["Dependentes", result.dependentes]
              ].map(([desc, val]) => (
                <tr key={desc}>
                  <td style={{ border: "1px solid #000", padding: "4px" }}>{desc}</td>
                  <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>
                    {typeof val === "number" ? val.toFixed(2) + " €" : val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "10px" }}>
            <button onClick={gerarPDF}>Gerar PDF</button>
          </div>
        </div>
      )}

      {historico.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h2>Histórico</h2>
          <ul>
            {historico.map((h, i) => (
              <li key={i}>
                {h.data} — {h.nome} — Bruto: {h.bruto.toFixed(2)} € → Líquido: {h.liquido.toFixed(2)} €
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
