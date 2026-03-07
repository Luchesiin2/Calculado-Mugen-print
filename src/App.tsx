import React, { useState, useMemo } from 'react';
import { Calculator, Package, User, DollarSign, Weight, History, Trash2, Save, Percent, TrendingUp, Download, Globe, X, Plus, Minus, Divide, Equal, FileText, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Calculation {
  id: string;
  name: string;
  filamentPrice: number;
  weight: number;
  retailMargin: number;
  wholesaleMargin: number;
  materialCost: number;
  retailPrice: number;
  wholesalePrice: number;
  timestamp: number;
}

export default function App() {
  const [filamentPrice, setFilamentPrice] = useState<number>(120);
  const [weight, setWeight] = useState<number>(50);
  const [retailMargin, setRetailMargin] = useState<number>(500); // Default to 6x (500% profit over cost)
  const [wholesaleMargin, setWholesaleMargin] = useState<number>(400); // Default to 5x (400% profit over cost)
  const [projectName, setProjectName] = useState<string>('');
  const [history, setHistory] = useState<Calculation[]>(() => {
    const saved = localStorage.getItem('calc_history_v3');
    return saved ? JSON.parse(saved) : [];
  });

  const [currency, setCurrency] = useState('R$');
  const [siteName, setSiteName] = useState(() => localStorage.getItem('site_name') || '3D Print Cost Master');
  const [siteLogo, setSiteLogo] = useState(() => localStorage.getItem('site_logo') || '');
  const [includeWholesaleInPDF, setIncludeWholesaleInPDF] = useState(false);
  const [showCalcPopup, setShowCalcPopup] = useState(false);
  const [showBrandingPopup, setShowBrandingPopup] = useState(false);
  const [showPdfPopup, setShowPdfPopup] = useState(false);
  const [pdfConfig, setPdfConfig] = useState(() => {
    const saved = localStorage.getItem('pdf_config');
    return saved ? JSON.parse(saved) : {
      title: 'Orçamento de Impressão 3D',
      subtitle: 'Calculadora Profissional',
      projectDetailsTitle: 'Detalhes do Projeto',
      projectNameLabel: 'Nome do Projeto',
      weightLabel: 'Peso Estimado',
      valuesSummaryTitle: 'Resumo de Valores',
      descriptionHeader: 'Descrição',
      totalHeader: 'Total',
      retailItemDescription: 'Serviço de Impressão 3D (Material + Mão de Obra)',
      wholesaleItemDescription: 'Preço para Atacado (Acima de 10 unidades)',
      footerNote: 'Este orçamento é uma estimativa baseada nos parâmetros fornecidos.',
    };
  });
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcExpression, setCalcExpression] = useState('');

  const handleCalcInput = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcExpression('');
      return;
    }
    if (val === '=') {
      try {
        // Simple eval-like logic for basic math
        const result = eval(calcExpression.replace(/[^-+/*0-9.]/g, ''));
        setCalcDisplay(String(result));
        setCalcExpression(String(result));
      } catch {
        setCalcDisplay('Erro');
      }
      return;
    }
    const newExpr = calcExpression + val;
    setCalcExpression(newExpr);
    setCalcDisplay(newExpr);
  };

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  React.useEffect(() => {
    // Check if already installed/standalone
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show button anyway if on mobile to provide instructions
    if (isIOSDevice || /Android/.test(navigator.userAgent)) {
      setShowInstallBtn(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    } else if (isIOS) {
      alert('Para instalar no iPhone: Clique no ícone de compartilhar (quadrado com seta) e selecione "Adicionar à Tela de Início".');
    } else {
      alert('Para instalar: Clique nos três pontinhos do navegador e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".');
    }
  };

  const generatePDF = async () => {
    const element = document.getElementById('pdf-template');
    if (!element) return;

    // Temporarily show the template to capture it
    element.style.display = 'block';
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Orcamento_${projectName.replace(/\s+/g, '_') || 'Impressao_3D'}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      element.style.display = 'none';
    }
  };

  const materialCost = useMemo(() => (filamentPrice / 1000) * weight, [filamentPrice, weight]);

  const retailPrice = useMemo(() => {
    return materialCost * (1 + retailMargin / 100);
  }, [materialCost, retailMargin]);

  const wholesalePrice = useMemo(() => {
    return materialCost * (1 + wholesaleMargin / 100);
  }, [materialCost, wholesaleMargin]);

  const saveCalculation = () => {
    const newCalc: Calculation = {
      id: crypto.randomUUID(),
      name: projectName || 'Projeto Sem Nome',
      filamentPrice,
      weight,
      retailMargin,
      wholesaleMargin,
      materialCost,
      retailPrice,
      wholesalePrice,
      timestamp: Date.now(),
    };
    const newHistory = [newCalc, ...history].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('calc_history_v3', JSON.stringify(newHistory));
    setProjectName('');
  };

  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('calc_history_v3', JSON.stringify(newHistory));
  };

  const saveBranding = (name: string, logo: string) => {
    setSiteName(name);
    setSiteLogo(logo);
    localStorage.setItem('site_name', name);
    localStorage.setItem('site_logo', logo);
  };

  const savePdfConfig = (config: any) => {
    setPdfConfig(config);
    localStorage.setItem('pdf_config', JSON.stringify(config));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {siteLogo ? (
              <img src={siteLogo} alt="Logo" className="w-12 h-12 object-contain rounded-lg shadow-sm" referrerPolicy="no-referrer" />
            ) : (
              <Calculator className="w-10 h-10 text-rose-900" />
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {siteName}
              </h1>
              <p className="text-slate-500 mt-1 text-sm md:text-base">Precificação por margem sobre o material</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBrandingPopup(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all border border-slate-200"
              >
                <Settings className="w-4 h-4" />
                Branding
              </button>
              <button
                onClick={() => setShowPdfPopup(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all border border-slate-200"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              {['R$', '$', '€'].map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`px-3 py-1 rounded-md text-sm font-bold transition-all ${
                    currency === curr ? 'bg-white text-rose-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-4 text-right">
            {showInstallBtn && !isStandalone && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-4 py-2 bg-rose-900 text-white rounded-full text-sm font-bold hover:bg-rose-950 transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                Instalar App
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 text-rose-900 font-medium">
                <div className="w-2 h-2 rounded-full bg-rose-800 animate-pulse" />
                Margens Personalizadas
              </div>
            </div>
          </div>
        </div>
      </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Calculator Card */}
          <div className="lg:col-span-8 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-rose-900" />
                  Configuração de Custos e Margens
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Projeto</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ex: Estátua Decorativa"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-900 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Material Section */}
                  <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Weight className="w-3 h-3" /> Custos de Material
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Preço Filamento ({currency}/kg)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="number"
                            value={filamentPrice}
                            onChange={(e) => setFilamentPrice(Number(e.target.value))}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Peso da Peça (g)</label>
                        <div className="relative">
                          <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(Number(e.target.value))}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Margins Section */}
                  <div className="space-y-4 p-5 bg-rose-50 rounded-2xl border border-rose-100">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-rose-900 flex items-center gap-2">
                      <Percent className="w-3 h-3" /> Margens de Lucro (%)
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Margem Cliente Final (%)</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-800" />
                          <input
                            type="number"
                            value={retailMargin}
                            onChange={(e) => setRetailMargin(Number(e.target.value))}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-900 outline-none"
                          />
                        </div>
                        <p className="text-[10px] text-rose-900 mt-1 italic">Ex: 500% = Preço 6x o custo</p>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Margem Atacado (%)</label>
                        <div className="relative">
                          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-800" />
                          <input
                            type="number"
                            value={wholesaleMargin}
                            onChange={(e) => setWholesaleMargin(Number(e.target.value))}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-900 outline-none"
                          />
                        </div>
                        <p className="text-[10px] text-rose-900 mt-1 italic">Ex: 400% = Preço 5x o custo</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                  <input
                    type="checkbox"
                    id="includeWholesale"
                    checked={includeWholesaleInPDF}
                    onChange={(e) => setIncludeWholesaleInPDF(e.target.checked)}
                    className="w-5 h-5 accent-rose-900 cursor-pointer"
                  />
                  <label htmlFor="includeWholesale" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Incluir preço de atacado no orçamento PDF
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={saveCalculation}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg"
                  >
                    <Save className="w-5 h-5" />
                    Salvar Cálculo
                  </button>
                  <button
                    onClick={generatePDF}
                    className="flex-1 py-4 bg-rose-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-rose-950 transition-colors shadow-lg"
                  >
                    <FileText className="w-5 h-5" />
                    Gerar PDF Cliente
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <Weight className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Custo de Material</span>
                </div>
                <div className="text-sm text-slate-500 mb-1">Custo Total do Projeto</div>
                <div className="text-4xl font-bold tracking-tight text-slate-900">
                  {currency} {materialCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-1 text-sm text-slate-500">
                  <div className="flex justify-between">
                    <span>Preço Filamento:</span>
                    <span className="font-mono">{currency} {filamentPrice.toFixed(2)}/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Custo por Grama:</span>
                    <span className="font-mono">{currency} {(filamentPrice / 1000).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peso Total:</span>
                    <span className="font-mono">{weight}g</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-rose-900 rounded-3xl p-6 text-white shadow-xl shadow-rose-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <User className="w-6 h-6 opacity-80" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">Cliente Final</span>
                </div>
                <div className="text-sm opacity-80 mb-1">Preço com {retailMargin}% de Margem</div>
                <div className="text-4xl font-bold tracking-tight">
                  {currency} {retailPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-sm">
                  <span>Lucro: {currency} {(retailPrice - materialCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span className="opacity-60">Multiplicador: {(retailPrice / materialCost).toFixed(1)}x</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <Package className="w-6 h-6 text-rose-900" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Atacado</span>
                </div>
                <div className="text-sm text-slate-500 mb-1">Preço com {wholesaleMargin}% de Margem</div>
                <div className="text-4xl font-bold tracking-tight text-slate-900">
                  {currency} {wholesalePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm text-slate-500">
                  <span>Lucro: {currency} {(wholesalePrice - materialCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span className="opacity-60">Multiplicador: {(wholesalePrice / materialCost).toFixed(1)}x</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Sidebar / History */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-rose-900" />
                  Histórico
                </h3>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {history.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-xs">Nenhum cálculo salvo.</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group relative hover:border-rose-200 hover:bg-rose-50/30 transition-all"
                      >
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="text-xs font-bold text-rose-900 mb-1 truncate pr-6">
                          {item.name}
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Final</div>
                            <div className="font-bold text-slate-700 text-sm">{currency} {item.retailPrice.toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Atacado</div>
                            <div className="font-bold text-slate-700 text-sm">{currency} {item.wholesalePrice.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-[9px] text-slate-400 flex justify-between border-t border-slate-200 pt-2">
                          <span>{item.weight}g | {item.retailMargin}% margem</span>
                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        {/* PDF Template (Hidden) */}
        <div id="pdf-template" style={{ display: 'none', width: '210mm', padding: '20mm', backgroundColor: 'white', color: '#1e293b', fontFamily: 'sans-serif' }}>
          <div style={{ borderBottom: '2px solid #881337', paddingBottom: '10mm', marginBottom: '10mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5mm' }}>
              {siteLogo && <img src={siteLogo} alt="Logo" style={{ width: '15mm', height: '15mm', objectFit: 'contain' }} referrerPolicy="no-referrer" />}
              <div>
                <h1 style={{ fontSize: '24pt', fontWeight: 'bold', color: '#881337', margin: 0 }}>{pdfConfig.title}</h1>
                <p style={{ fontSize: '10pt', color: '#64748b', marginTop: '2mm' }}>Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 'bold', margin: 0 }}>{siteName}</p>
              <p style={{ fontSize: '9pt', color: '#64748b', margin: 0 }}>{pdfConfig.subtitle}</p>
            </div>
          </div>

          <div style={{ marginBottom: '10mm' }}>
            <h2 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '4mm', borderLeft: '4px solid #881337', paddingLeft: '3mm' }}>{pdfConfig.projectDetailsTitle}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', backgroundColor: '#f8fafc', padding: '5mm', borderRadius: '4mm' }}>
              <div>
                <p style={{ fontSize: '9pt', color: '#64748b', margin: 0 }}>{pdfConfig.projectNameLabel}</p>
                <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: 0 }}>{projectName || 'Projeto Sem Nome'}</p>
              </div>
              <div>
                <p style={{ fontSize: '9pt', color: '#64748b', margin: 0 }}>{pdfConfig.weightLabel}</p>
                <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: 0 }}>{weight}g</p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '10mm' }}>
            <h2 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '4mm', borderLeft: '4px solid #881337', paddingLeft: '3mm' }}>{pdfConfig.valuesSummaryTitle}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '3mm 0', color: '#64748b', fontSize: '10pt' }}>{pdfConfig.descriptionHeader}</th>
                  <th style={{ textAlign: 'right', padding: '3mm 0', color: '#64748b', fontSize: '10pt' }}>{pdfConfig.totalHeader}</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4mm 0', fontSize: '11pt' }}>{pdfConfig.retailItemDescription}</td>
                  <td style={{ padding: '4mm 0', textAlign: 'right', fontSize: '11pt', fontWeight: 'bold' }}>{currency} {retailPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
                {includeWholesaleInPDF && wholesaleMargin > 0 && (
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '4mm 0', fontSize: '11pt' }}>{pdfConfig.wholesaleItemDescription}</td>
                    <td style={{ padding: '4mm 0', textAlign: 'right', fontSize: '11pt', fontWeight: 'bold' }}>{currency} {wholesalePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '20mm', paddingTop: '10mm', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ fontSize: '10pt', color: '#64748b' }}>{pdfConfig.footerNote}</p>
            <p style={{ fontSize: '9pt', color: '#94a3b8', marginTop: '2mm' }}>Calculado via {siteName}</p>
          </div>
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
          {showInstallBtn && !isStandalone && (
            <div className="relative group">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white p-3 rounded-xl shadow-xl border border-slate-100 w-48 pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity"
              >
                <p className="text-xs font-bold text-slate-800">Instalar Aplicativo</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isIOS 
                    ? 'Clique em compartilhar e "Adicionar à Tela de Início"' 
                    : 'Acesse offline e tenha um ícone na sua tela inicial.'}
                </p>
              </motion.div>
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={handleInstallClick}
                className="w-14 h-14 bg-rose-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-rose-950 transition-all"
              >
                <Download className="w-6 h-6" />
              </motion.button>
            </div>
          )}
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowCalcPopup(!showCalcPopup)}
            className="w-14 h-14 bg-slate-800 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-900 transition-all group relative"
          >
            {showCalcPopup ? <X className="w-6 h-6" /> : <Calculator className="w-6 h-6" />}
            <span className="absolute right-full mr-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Calculadora Rápida
            </span>
          </motion.button>
        </div>

        {/* PDF Customization Popup */}
        <AnimatePresence>
          {showPdfPopup && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
              >
                <div className="bg-rose-900 p-6 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Personalizar Textos do PDF</h2>
                  </div>
                  <button 
                    onClick={() => setShowPdfPopup(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Título do PDF</label>
                      <input
                        type="text"
                        value={pdfConfig.title}
                        onChange={(e) => savePdfConfig({ ...pdfConfig, title: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Subtítulo</label>
                      <input
                        type="text"
                        value={pdfConfig.subtitle}
                        onChange={(e) => savePdfConfig({ ...pdfConfig, subtitle: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Título Detalhes Projeto</label>
                      <input
                        type="text"
                        value={pdfConfig.projectDetailsTitle}
                        onChange={(e) => savePdfConfig({ ...pdfConfig, projectDetailsTitle: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Label Nome Projeto</label>
                      <input
                        type="text"
                        value={pdfConfig.projectNameLabel}
                        onChange={(e) => savePdfConfig({ ...pdfConfig, projectNameLabel: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Label Peso</label>
                      <input
                        type="text"
                        value={pdfConfig.weightLabel}
                        onChange={(e) => savePdfConfig({ ...pdfConfig, weightLabel: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Título Resumo Valores</label>
                      <input
                        type="text"
                        value={pdfConfig.valuesSummaryTitle}
                        onChange={(e) => savePdfConfig({ ...pdfConfig, valuesSummaryTitle: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Header Descrição</label>
                      <input
                        type="text"
                        value={pdfConfig.descriptionHeader}
                        onChange={(e) => savePdfConfig({ ...pdfConfig, descriptionHeader: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Header Total</label>
                      <input
                        type="text"
                        value={pdfConfig.totalHeader}
                        onChange={(e) => savePdfConfig({ ...pdfConfig, totalHeader: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Descrição Item Varejo</label>
                      <input
                        type="text"
                        value={pdfConfig.retailItemDescription}
                        onChange={(e) => savePdfConfig({ ...pdfConfig, retailItemDescription: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Descrição Item Atacado</label>
                      <input
                        type="text"
                        value={pdfConfig.wholesaleItemDescription}
                        onChange={(e) => savePdfConfig({ ...pdfConfig, wholesaleItemDescription: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nota de Rodapé</label>
                      <textarea
                        value={pdfConfig.footerNote}
                        onChange={(e) => savePdfConfig({ ...pdfConfig, footerNote: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none h-20 resize-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPdfPopup(false)}
                    className="w-full mt-8 py-4 bg-rose-900 text-white rounded-xl font-bold hover:bg-rose-950 transition-all shadow-lg"
                  >
                    Salvar e Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Branding Popup */}
        <AnimatePresence>
          {showBrandingPopup && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
              >
                <div className="bg-rose-900 p-6 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Branding e Identidade</h2>
                  </div>
                  <button 
                    onClick={() => setShowBrandingPopup(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-8 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nome da Empresa/Site</label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => saveBranding(e.target.value, siteLogo)}
                      placeholder="Ex: Minha Oficina 3D"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-800 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">URL da Logo (PNG/JPG)</label>
                    <input
                      type="text"
                      value={siteLogo}
                      onChange={(e) => saveBranding(siteName, e.target.value)}
                      placeholder="https://exemplo.com/logo.png"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-800 focus:border-transparent outline-none transition-all"
                    />
                    <p className="text-xs text-slate-400 mt-2 italic">A logo aparecerá no cabeçalho e nos PDFs gerados.</p>
                  </div>
                  <button
                    onClick={() => setShowBrandingPopup(false)}
                    className="w-full py-4 bg-rose-900 text-white rounded-xl font-bold hover:bg-rose-950 transition-all shadow-lg"
                  >
                    Salvar e Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Common Calculator Popup */}
        <AnimatePresence>
          {showCalcPopup && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-24 right-6 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50"
            >
              <div className="bg-slate-800 p-4 text-right">
                <div className="text-slate-400 text-xs h-4 overflow-hidden">{calcExpression || ' '}</div>
                <div className="text-white text-3xl font-mono font-bold truncate">{calcDisplay}</div>
              </div>
              <div className="grid grid-cols-4 gap-2 p-4 bg-slate-50">
                {['C', '/', '*', '-', '7', '8', '9', '+', '4', '5', '6', '=', '1', '2', '3', '0', '.'].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => handleCalcInput(btn)}
                    className={`h-12 rounded-xl font-bold transition-all shadow-sm active:scale-95 ${
                      btn === '=' 
                        ? 'col-span-1 bg-rose-900 text-white hover:bg-rose-950' 
                        : btn === 'C'
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : ['/', '*', '-', '+'].includes(btn)
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    } ${btn === '0' ? 'col-span-1' : ''}`}
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <footer className="mt-12 text-center text-slate-400 text-xs pb-8">
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="md:hidden mb-6 mx-auto flex items-center gap-2 px-6 py-3 bg-rose-900 text-white rounded-full text-sm font-bold hover:bg-rose-950 transition-all shadow-lg"
            >
              <Download className="w-4 h-4" />
              Instalar Aplicativo (PWA)
            </button>
          )}
          <p>© {new Date().getFullYear()} {siteName} • Gestão de Precificação</p>
          <p className="mt-2">Fórmula: Preço = Custo Base * (1 + Margem%)</p>
        </footer>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
