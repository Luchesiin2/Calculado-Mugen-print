import React, { useState, useMemo } from 'react';
import { Calculator, Package, User, DollarSign, Weight, History, Trash2, Save, Percent, TrendingUp, Download, Globe, X, Plus, Minus, Divide, Equal, FileText, Settings, Copy, Share2, MessageCircle, ArrowUpRight, ShoppingBag, Truck, Tag, Megaphone, Info, Clock, Zap, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

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
  // Advanced cost fields
  useAdvancedCosts?: boolean;
  printTimeHours?: number;
  printTimeMinutes?: number;
  hourlyRate?: number;
  electricityKwhPrice?: number;
  printerPowerWatts?: number;
  advancedTotalCost?: number;
  printerPrice?: number;
  printerLifespan?: number;
  printerModel?: string;
  // Keychain specific fields
  isKeychainMode?: boolean;
  keychainRingPrice?: number;
  keychainPurgeWeight?: number;
  lossPercentage?: number;
}

const PRINTER_PRESETS = [
  { name: 'Personalizado', price: 1500, lifespan: 5000 },
  { name: 'Bambu Lab A1 Mini', price: 1900, lifespan: 5000 },
  { name: 'Bambu Lab A1', price: 3200, lifespan: 6000 },
  { name: 'Bambu Lab P1P', price: 5500, lifespan: 8000 },
  { name: 'Bambu Lab P1S', price: 6500, lifespan: 8000 },
  { name: 'Bambu Lab X1-Carbon', price: 12500, lifespan: 10000 },
  { name: 'Creality Ender 3 V3 SE', price: 1300, lifespan: 3000 },
  { name: 'Creality Ender 3 V3 KE', price: 1900, lifespan: 4000 },
  { name: 'Creality K1C', price: 3800, lifespan: 6000 },
  { name: 'Creality K1', price: 3200, lifespan: 6000 },
  { name: 'Creality K1 Max', price: 5500, lifespan: 8000 },
  { name: 'Creality Ender 3 V2', price: 1100, lifespan: 2500 },
  { name: 'Prusa MK4', price: 9500, lifespan: 12000 },
  { name: 'Prusa MINI+', price: 4500, lifespan: 8000 },
  { name: 'Elegoo Neptune 4 Pro', price: 2300, lifespan: 4000 },
  { name: 'Anycubic Kobra 2 Pro', price: 2400, lifespan: 4000 },
  { name: 'Sovol SV06', price: 1800, lifespan: 4000 },
  { name: 'Resina: Elegoo Mars 5', price: 2500, lifespan: 2000 },
  { name: 'Resina: Anycubic Photon Mono 2', price: 1800, lifespan: 2000 },
];

export default function App() {
  const [filamentPrice, setFilamentPrice] = useState<number>(120);
  const [weight, setWeight] = useState<number>(50);
  const [retailMargin, setRetailMargin] = useState<number>(500); // Default to 6x (500% profit over cost)
  const [wholesaleMargin, setWholesaleMargin] = useState<number>(400); // Default to 5x (400% profit over cost)
  const [projectName, setProjectName] = useState<string>('');
  const [lossPercentage, setLossPercentage] = useState<number>(10);
  const [history, setHistory] = useState<Calculation[]>(() => {
    const saved = localStorage.getItem('calc_history_v3');
    return saved ? JSON.parse(saved) : [];
  });

  const [currency, setCurrency] = useState('R$');
  const [siteName, setSiteName] = useState(() => localStorage.getItem('site_name') || 'Calculadora 3D');
  const [siteLogo, setSiteLogo] = useState(() => localStorage.getItem('site_logo') || '');
  const [includeWholesaleInPDF, setIncludeWholesaleInPDF] = useState(false);
  const [showCalcPopup, setShowCalcPopup] = useState(false);
  const [showBrandingPopup, setShowBrandingPopup] = useState(false);
  const [showPdfPopup, setShowPdfPopup] = useState(false);
  const [showTextQuotePopup, setShowTextQuotePopup] = useState(false);
  const [showShopeeInfo, setShowShopeeInfo] = useState(false);
  const [textQuote, setTextQuote] = useState('');
  const [quoteType, setQuoteType] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [pdfConfig, setPdfConfig] = useState(() => {
    const saved = localStorage.getItem('pdf_config');
    return saved ? JSON.parse(saved) : {
      title: 'Orçamento de Impressão 3D',
      subtitle: 'Calculadora 3D',
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

  // Advanced Cost States
  const [useAdvancedCosts, setUseAdvancedCosts] = useState<boolean>(false);
  const [printTimeHours, setPrintTimeHours] = useState<number>(0);
  const [printTimeMinutes, setPrintTimeMinutes] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(5);
  const [electricityKwhPrice, setElectricityKwhPrice] = useState<number>(0.85);
  const [printerPowerWatts, setPrinterPowerWatts] = useState<number>(150);
  const [printerPrice, setPrinterPrice] = useState<number>(1500);
  const [printerLifespan, setPrinterLifespan] = useState<number>(5000);
  const [printerModel, setPrinterModel] = useState<string>('Personalizado');

  // Keychain States
  const [keychainRingPrice, setKeychainRingPrice] = useState<number>(0.50);
  const [keychainPurgeWeight, setKeychainPurgeWeight] = useState<number>(0);
  const [isKeychainMode, setIsKeychainMode] = useState<boolean>(false);

  const handlePrinterModelChange = (modelName: string) => {
    setPrinterModel(modelName);
    const preset = PRINTER_PRESETS.find(p => p.name === modelName);
    if (preset) {
      setPrinterPrice(preset.price);
      setPrinterLifespan(preset.lifespan);
    }
  };

  // Shopee Calculator States
  const [activeTab, setActiveTab] = useState<'direct' | 'shopee' | 'keychain' | 'mercadolivre'>('direct');
  const [shopeeShipping, setShopeeShipping] = useState<number>(0);
  const [shopeeAds, setShopeeAds] = useState<number>(0);
  const [shopeeDiscount, setShopeeDiscount] = useState<number>(0);
  const [shopeeTaxRate, setShopeeTaxRate] = useState<number>(4);
  const [shopeeManualPrice, setShopeeManualPrice] = useState<number>(0);

  // Mercado Livre States
  const [mlListingType, setMlListingType] = useState<'classico' | 'premium'>('classico');
  const [mlCommissionRate, setMlCommissionRate] = useState<number>(11.5);
  const [mlShippingCost, setMlShippingCost] = useState<number>(0);
  const [mlTaxRate, setMlTaxRate] = useState<number>(4);
  const [mlManualPrice, setMlManualPrice] = useState<number>(0);
  const [showMlInfo, setShowMlInfo] = useState(false);

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

  const keychainPurgeCost = useMemo(() => {
    if (!isKeychainMode) return 0;
    return (filamentPrice / 1000) * keychainPurgeWeight;
  }, [isKeychainMode, filamentPrice, keychainPurgeWeight]);

  const keychainExtrasCost = useMemo(() => {
    if (!isKeychainMode) return 0;
    return keychainRingPrice;
  }, [isKeychainMode, keychainRingPrice]);

  const advancedCosts = useMemo(() => {
    if (!useAdvancedCosts) return { total: 0, electricity: 0, labor: 0, depreciation: 0, totalHours: 0 };
    const totalHours = printTimeHours + (printTimeMinutes / 60);
    const electricity = (printerPowerWatts / 1000) * totalHours * electricityKwhPrice;
    const labor = totalHours * hourlyRate;
    const depreciation = printerLifespan > 0 ? (printerPrice / printerLifespan) * totalHours : 0;
    return {
      total: electricity + labor + depreciation,
      electricity,
      labor,
      depreciation,
      totalHours
    };
  }, [useAdvancedCosts, printTimeHours, printTimeMinutes, hourlyRate, electricityKwhPrice, printerPowerWatts, printerPrice, printerLifespan]);

  const materialLossCost = useMemo(() => {
    return (materialCost + keychainPurgeCost) * (lossPercentage / 100);
  }, [materialCost, keychainPurgeCost, lossPercentage]);

  const totalProductionCost = useMemo(() => materialCost + keychainPurgeCost + keychainExtrasCost + advancedCosts.total + materialLossCost, [materialCost, keychainPurgeCost, keychainExtrasCost, advancedCosts.total, materialLossCost]);

  const retailPrice = useMemo(() => {
    return totalProductionCost * (1 + retailMargin / 100);
  }, [totalProductionCost, retailMargin]);

  const wholesalePrice = useMemo(() => {
    return totalProductionCost * (1 + wholesaleMargin / 100);
  }, [totalProductionCost, wholesaleMargin]);

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
      useAdvancedCosts,
      printTimeHours,
      printTimeMinutes,
      hourlyRate,
      electricityKwhPrice,
      printerPowerWatts,
      printerPrice,
      printerLifespan,
      printerModel,
      isKeychainMode,
      keychainRingPrice,
      keychainPurgeWeight,
      advancedTotalCost: advancedCosts.total,
      lossPercentage
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

  const loadHistoryItem = (item: Calculation) => {
    setProjectName(item.name);
    setFilamentPrice(item.filamentPrice);
    setWeight(item.weight);
    setLossPercentage(item.lossPercentage !== undefined ? item.lossPercentage : 10);
    setRetailMargin(item.retailMargin);
    setWholesaleMargin(item.wholesaleMargin);
    setUseAdvancedCosts(item.useAdvancedCosts || false);
    setPrintTimeHours(item.printTimeHours || 0);
    setPrintTimeMinutes(item.printTimeMinutes || 0);
    setHourlyRate(item.hourlyRate || 5);
    setElectricityKwhPrice(item.electricityKwhPrice || 0.85);
    setPrinterPowerWatts(item.printerPowerWatts || 150);
    setPrinterPrice(item.printerPrice || 1500);
    setPrinterLifespan(item.printerLifespan || 5000);
    setPrinterModel(item.printerModel || 'Personalizado');
    setIsKeychainMode(item.isKeychainMode || false);
    if (item.isKeychainMode) {
      setActiveTab('keychain');
      setKeychainRingPrice(item.keychainRingPrice || 0);
      setKeychainPurgeWeight(item.keychainPurgeWeight || 0);
    } else {
      setActiveTab('direct');
    }
    // Scroll to top to see the loaded values
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const shopeeResults = useMemo(() => {
    const price = shopeeManualPrice || retailPrice;
    
    let commissionRate = 0;
    let fixedFee = 0;

    if (price <= 79.99) {
      commissionRate = 0.20;
      fixedFee = 4.00;
    } else if (price <= 99.99) {
      commissionRate = 0.14;
      fixedFee = 16.00;
    } else if (price <= 199.99) {
      commissionRate = 0.14;
      fixedFee = 20.00;
    } else {
      commissionRate = 0.14;
      fixedFee = 26.00;
    }

    const commission = price * commissionRate + fixedFee;
    const tax = price * (shopeeTaxRate / 100);
    const totalFees = commission + tax + shopeeShipping + shopeeAds + shopeeDiscount;
    const netProfit = price - totalProductionCost - totalFees;
    const margin = price > 0 ? (netProfit / price) * 100 : 0;

    // Calculate suggested price to maintain the same profit as retailPrice
    const targetProfit = retailPrice - totalProductionCost;
    const otherCosts = shopeeShipping + shopeeAds + shopeeDiscount;
    const suggestedPrice = (targetProfit + totalProductionCost + fixedFee + otherCosts) / (1 - commissionRate - (shopeeTaxRate / 100));

    return {
      price,
      commission,
      tax,
      totalFees,
      netProfit,
      margin,
      commissionRate: commissionRate * 100,
      fixedFee,
      suggestedPrice
    };
  }, [shopeeManualPrice, retailPrice, totalProductionCost, shopeeShipping, shopeeAds, shopeeDiscount, shopeeTaxRate]);

  const mlResults = useMemo(() => {
    const price = mlManualPrice || retailPrice;
    
    // ML fixed fee: R$ 6,00 if price < R$ 79,00
    const fixedFee = price < 79 ? 6 : 0;
    const commission = (price * (mlCommissionRate / 100)) + fixedFee;
    const tax = price * (mlTaxRate / 100);
    
    const totalFees = commission + tax + mlShippingCost;
    const netProfit = price - totalProductionCost - totalFees;
    const margin = price > 0 ? (netProfit / price) * 100 : 0;

    // Suggested price calculation for ML
    // Target Profit = retailPrice - totalProductionCost
    // Net Profit = Price - MaterialTotal - (Price * CommRate + FixedFee) - Tax - Shipping
    // Target Profit = Price * (1 - CommRate - TaxRate) - MaterialTotal - FixedFee - Shipping
    // Price = (Target Profit + totalProductionCost + FixedFee + Shipping) / (1 - CommRate - TaxRate)
    
    const targetProfit = retailPrice - totalProductionCost;
    const suggestedPrice = (targetProfit + totalProductionCost + fixedFee + mlShippingCost) / (1 - (mlCommissionRate / 100) - (mlTaxRate / 100));

    return {
      price,
      commission,
      tax,
      totalFees,
      netProfit,
      margin,
      fixedFee,
      suggestedPrice
    };
  }, [mlManualPrice, retailPrice, totalProductionCost, mlCommissionRate, mlTaxRate, mlShippingCost]);

  const suggestShopeePrice = () => {
    setShopeeManualPrice(Number(shopeeResults.suggestedPrice.toFixed(2)));
  };

  const suggestMlPrice = () => {
    setMlManualPrice(Number(mlResults.suggestedPrice.toFixed(2)));
  };

  const handleMlTypeChange = (type: 'classico' | 'premium') => {
    setMlListingType(type);
    setMlCommissionRate(type === 'classico' ? 11.5 : 16.5);
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

  const generateTextQuote = (type: 'whatsapp' | 'instagram') => {
    const name = projectName || 'Projeto Sem Nome';
    const retail = retailPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const wholesale = wholesalePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const isWA = type === 'whatsapp';
    const b = isWA ? '*' : ''; // Bold char for WhatsApp
    
    let text = `✨ ${b}${pdfConfig.title}${b} ✨\n`;
    text += `${b}${siteName}${b}\n\n`;
    text += `Olá! Segue o orçamento detalhado para o seu projeto:\n\n`;
    text += `📦 ${b}Item:${b} ${name}\n`;
    text += `🛠️ ${b}Serviço:${b} Impressão 3D de alta qualidade com acabamento profissional.\n\n`;
    text += `💎 ${b}Investimento Unitário:${b} ${currency} ${retail}\n`;
    
    if (includeWholesaleInPDF) {
      text += `🚀 ${b}Condição Especial para Atacado:${b} ${currency} ${wholesale}\n`;
      text += `_(Válido para pedidos acima de 10 unidades)_\n\n`;
    }
    
    text += `•  50% de sinal para iniciar a produção\n`;
    text += `•  50% restantes pagos na finalização\n\n`;
    
    text += `✅ ${b}Garantia de Qualidade:${b} Utilizamos os melhores materiais do mercado para garantir resistência e precisão nos detalhes.\n\n`;
    
    text += `⏳ ${b}Prazo de entrega:${b} até 25 dias após a confirmação do sinal\n\n`;
    
    text += `📝 ${b}Observação:${b} ${pdfConfig.footerNote}\n`;
    text += `\nFicamos à disposição para tirar qualquer dúvida! 👋`;
    
    return text;
  };

  const openTextQuote = () => {
    const initialText = generateTextQuote('whatsapp');
    setTextQuote(initialText);
    setQuoteType('whatsapp');
    setShowTextQuotePopup(true);
  };

  const handleQuoteTypeChange = (type: 'whatsapp' | 'instagram') => {
    setQuoteType(type);
    setTextQuote(generateTextQuote(type));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(textQuote);
    alert('Texto copiado para a área de transferência!');
  };

  const shareWhatsApp = () => {
    const encodedText = encodeURIComponent(textQuote);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const chartData = useMemo(() => {
    if (activeTab === 'shopee') {
      return [
        { name: 'Produção', valor: totalProductionCost, color: '#64748b' },
        { name: 'Venda', valor: shopeeResults.price, color: '#f97316' },
        { name: 'Lucro L.', valor: shopeeResults.netProfit, color: '#10b981' }
      ];
    }
    if (activeTab === 'mercadolivre') {
      return [
        { name: 'Produção', valor: totalProductionCost, color: '#64748b' },
        { name: 'Venda', valor: mlResults.price, color: '#facc15' },
        { name: 'Lucro L.', valor: mlResults.netProfit, color: '#10b981' }
      ];
    }
    return [
      {
        name: 'Produção',
        valor: totalProductionCost,
        color: '#64748b'
      },
      {
        name: 'Varejo',
        valor: retailPrice,
        color: '#881337'
      },
      {
        name: 'Atacado',
        valor: wholesalePrice,
        color: '#f43f5e'
      }
    ];
  }, [activeTab, totalProductionCost, retailPrice, wholesalePrice, shopeeResults, mlResults]);

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

        <div className="flex items-center gap-2 mb-6 bg-slate-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => {
              setActiveTab('direct');
              setIsKeychainMode(false);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'direct' 
                ? 'bg-white text-rose-900 shadow-md' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            Venda Direta
          </button>
          <button
            onClick={() => setActiveTab('shopee')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'shopee' 
                ? 'bg-white text-rose-900 shadow-md' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Shopee
          </button>
          <button
            onClick={() => setActiveTab('mercadolivre')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'mercadolivre' 
                ? 'bg-white text-rose-900 shadow-md' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Globe className="w-4 h-4" />
            Mercado Livre
          </button>
          <button
            onClick={() => {
              setActiveTab('keychain');
              setIsKeychainMode(true);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'keychain' 
                ? 'bg-white text-rose-900 shadow-md' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Tag className="w-4 h-4" />
            Chaveiro 3D
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Calculator Card */}
          <div className="lg:col-span-8 space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === 'direct' ? (
                <motion.div 
                  key="direct-calc"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
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
                          <div>
                            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                              Perda de Material ou Erro (%)
                              <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" title="Porcentagem extra de filamento para compensar falhas de impressão, suportes, purgas ou rebarbas desnecessárias." />
                            </label>
                            <div className="relative">
                              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="number"
                                value={lossPercentage}
                                onChange={(e) => setLossPercentage(Number(e.target.value))}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                                min="0"
                                max="100"
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

                      {/* Advanced Costs Section */}
                      <div className="md:col-span-2">
                        <div 
                          onClick={() => setUseAdvancedCosts(!useAdvancedCosts)}
                          className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl shadow-lg cursor-pointer hover:bg-slate-800 transition-all mb-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${useAdvancedCosts ? 'bg-rose-500' : 'bg-slate-600'}`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${useAdvancedCosts ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold">Ativar Custos Avançados</h3>
                              <p className="text-[10px] opacity-70 italic">Contabilizar tempo de impressão e eletricidade no custo base</p>
                            </div>
                          </div>
                          <Clock className={`w-6 h-6 transition-all ${useAdvancedCosts ? 'text-rose-400 opacity-100' : 'text-white opacity-30'}`} />
                        </div>

                        {useAdvancedCosts && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mb-6"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-rose-50/30 border border-rose-100/50 rounded-3xl">
                              <div className="space-y-4">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                  <Clock className="w-3 h-3" /> Tempo e Mão de Obra
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                      Horas
                                      <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Tempo total de horas de impressão." />
                                    </label>
                                    <input
                                      type="number"
                                      value={printTimeHours}
                                      onChange={(e) => setPrintTimeHours(Number(e.target.value))}
                                      className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                      Minutos
                                      <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Minutos adicionais ao tempo de impressão." />
                                    </label>
                                    <input
                                      type="number"
                                      value={printTimeMinutes}
                                      onChange={(e) => setPrintTimeMinutes(Number(e.target.value))}
                                      className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                    Custo Hora ({currency})
                                    <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Valor cobrado por hora de uso da máquina (mão de obra + lucro operacional)." />
                                  </label>
                                  <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                      type="number"
                                      value={hourlyRate}
                                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                                      className="w-full pl-8 pr-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none"
                                    />
                                  </div>
                                  <p className="text-[9px] text-slate-400 mt-1 italic">Mão de obra, manutenção e uso da máquina</p>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                  <Zap className="w-3 h-3" /> Energia Elétrica
                                </h3>
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                    Preço kWh ({currency})
                                    <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Custo da energia elétrica por kilowatt-hora (verifique sua conta de luz)." />
                                  </label>
                                  <input
                                    type="number"
                                    value={electricityKwhPrice}
                                    step="0.01"
                                    onChange={(e) => setElectricityKwhPrice(Number(e.target.value))}
                                    className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                    Consumo Impressora (Watts)
                                    <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Potência média consumida pela impressora durante a operação." />
                                  </label>
                                  <input
                                    type="number"
                                    value={printerPowerWatts}
                                    onChange={(e) => setPrinterPowerWatts(Number(e.target.value))}
                                    className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none"
                                  />
                                  <p className="text-[9px] text-slate-400 mt-1 italic">Média: 150W - 300W</p>
                                </div>
                              </div>

                              <div className="space-y-4 md:col-span-2 lg:col-span-1">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                  <TrendingUp className="w-3 h-3" /> Depreciação
                                </h3>
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-1 font-bold">Modelo da Impressora</label>
                                  <select
                                    value={printerModel}
                                    onChange={(e) => handlePrinterModelChange(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none bg-white text-sm"
                                  >
                                    {PRINTER_PRESETS.map((p) => (
                                      <option key={p.name} value={p.name}>{p.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                                  <div>
                                    <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                      Preço Máquina ({currency})
                                      <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Valor pago pela impressora para cálculo de amortização." />
                                    </label>
                                    <div className="relative">
                                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                      <input
                                        type="number"
                                        value={printerPrice}
                                        onChange={(e) => setPrinterPrice(Number(e.target.value))}
                                        className="w-full pl-8 pr-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                      Vida Útil / Próxima Manutenção (Horas)
                                      <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Horas de trabalho estimadas até a próxima grande manutenção." />
                                    </label>
                                    <input
                                      type="number"
                                      value={printerLifespan}
                                      onChange={(e) => setPrinterLifespan(Number(e.target.value))}
                                      className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none"
                                    />
                                  </div>
                                </div>
                                <p className="text-[9px] text-slate-400 italic">Custo para amortizar investimento ou manutenção preventiva</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
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
                      <button
                        onClick={openTextQuote}
                        className="flex-1 py-4 bg-rose-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-rose-950 transition-colors shadow-lg"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Enviar por Texto
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === 'keychain' ? (
                <motion.div 
                  key="keychain-calc"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Tag className="w-5 h-5 text-rose-900" />
                      Especialista em Chaveiros 3D
                    </h2>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Chaveiro</label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Ex: Chaveiro Logo Empresa"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-900 focus:border-transparent outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Material Section */}
                      <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <Weight className="w-3 h-3" /> Custos de Insumo
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Preço Filamento ({currency}/kg)</label>
                            <input
                              type="number"
                              value={filamentPrice}
                              onChange={(e) => setFilamentPrice(Number(e.target.value))}
                              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Peso Peça (g)</label>
                              <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(Number(e.target.value))}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                                Purga (g) <span className="text-[9px] text-rose-500 italic opacity-70">Colorido</span>
                                <Info className="w-3 h-3 text-slate-400 cursor-help" title="Peso do material desperdiçado durante a troca de cores (prime tower/purge)." />
                              </label>
                              <input
                                type="number"
                                value={keychainPurgeWeight}
                                onChange={(e) => setKeychainPurgeWeight(Number(e.target.value))}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                              Preço unitário Argola ({currency})
                              <Info className="w-3 h-3 text-slate-400 cursor-help" title="Preço de custo de uma argola de chaveiro completa." />
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="number"
                                value={keychainRingPrice}
                                step="0.01"
                                onChange={(e) => setKeychainRingPrice(Number(e.target.value))}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                              Perda de Material ou Erro (%)
                              <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" title="Porcentagem extra de filamento para compensar falhas de impressão, suportes, purgas ou rebarbas desnecessárias." />
                            </label>
                            <div className="relative">
                              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="number"
                                value={lossPercentage}
                                onChange={(e) => setLossPercentage(Number(e.target.value))}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none font-medium"
                                min="0"
                                max="100"
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
                            <label className="block text-xs text-slate-500 mb-1">Margem Varejo (%)</label>
                            <input
                              type="number"
                              value={retailMargin}
                              onChange={(e) => setRetailMargin(Number(e.target.value))}
                              className="w-full px-4 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-900 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Margem Atacado (%)</label>
                            <input
                              type="number"
                              value={wholesaleMargin}
                              onChange={(e) => setWholesaleMargin(Number(e.target.value))}
                              className="w-full px-4 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-900 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Costs Segment */}
                    <div className="md:col-span-2">
                      <div 
                        onClick={() => setUseAdvancedCosts(!useAdvancedCosts)}
                        className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl shadow-lg cursor-pointer hover:bg-slate-800 transition-all mb-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${useAdvancedCosts ? 'bg-rose-500' : 'bg-slate-600'}`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${useAdvancedCosts ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold">Ativar Depreciação e Tempo</h3>
                          </div>
                        </div>
                        <Clock className={`w-6 h-6 ${useAdvancedCosts ? 'text-rose-400' : 'opacity-30'}`} />
                      </div>

                      {useAdvancedCosts && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mb-6"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-rose-50/30 border border-rose-100/50 rounded-3xl">
                            <div className="space-y-4">
                              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Tempo e Mão de Obra
                              </h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                    Horas
                                    <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Tempo total de horas de impressão." />
                                  </label>
                                  <input
                                    type="number"
                                    value={printTimeHours}
                                    onChange={(e) => setPrintTimeHours(Number(e.target.value))}
                                    className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                    Minutos
                                    <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Minutos adicionais ao tempo de impressão." />
                                  </label>
                                  <input
                                    type="number"
                                    value={printTimeMinutes}
                                    onChange={(e) => setPrintTimeMinutes(Number(e.target.value))}
                                    className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none text-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                  Custo Hora ({currency})
                                  <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Valor cobrado por hora de uso da máquina (mão de obra + lucro operacional)." />
                                </label>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                  <input
                                    type="number"
                                    value={hourlyRate}
                                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                                    className="w-full pl-8 pr-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none text-sm"
                                  />
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1 italic">Mão de obra e lucro operacional</p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Zap className="w-3 h-3" /> Energia Elétrica
                              </h3>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                  Preço kWh ({currency})
                                  <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Custo da energia elétrica por kilowatt-hora (verifique sua conta de luz)." />
                                </label>
                                <input
                                  type="number"
                                  value={electricityKwhPrice}
                                  step="0.01"
                                  onChange={(e) => setElectricityKwhPrice(Number(e.target.value))}
                                  className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                  Consumo Impressora (Watts)
                                  <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Potência média consumida pela impressora durante a operação." />
                                </label>
                                <input
                                  type="number"
                                  value={printerPowerWatts}
                                  onChange={(e) => setPrinterPowerWatts(Number(e.target.value))}
                                  className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none text-sm"
                                />
                                <p className="text-[9px] text-slate-400 mt-1 italic">Média: 150W - 300W</p>
                              </div>
                            </div>

                            <div className="space-y-4 md:col-span-2">
                              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" /> Máquina e Depreciação
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] text-slate-500 mb-1 font-bold">Modelo</label>
                                  <select
                                    value={printerModel}
                                    onChange={(e) => handlePrinterModelChange(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none bg-white text-sm"
                                  >
                                    {PRINTER_PRESETS.map((p) => (
                                      <option key={p.name} value={p.name}>{p.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                      Preço Máquina
                                      <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Valor pago pela impressora para cálculo de amortização." />
                                    </label>
                                    <input
                                      type="number"
                                      value={printerPrice}
                                      onChange={(e) => setPrinterPrice(Number(e.target.value))}
                                      className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-500 mb-1 font-bold flex items-center gap-1">
                                      Vida Útil (h)
                                      <Info className="w-2.5 h-2.5 text-slate-400 cursor-help" title="Horas de trabalho estimadas até a próxima grande manutenção." />
                                    </label>
                                    <input
                                      type="number"
                                      value={printerLifespan}
                                      onChange={(e) => setPrinterLifespan(Number(e.target.value))}
                                      className="w-full px-4 py-2 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-900 outline-none text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={saveCalculation}
                        className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg"
                      >
                        <Save className="w-5 h-5" />
                        Salvar Chaveiro
                      </button>
                      <button
                        onClick={generatePDF}
                        className="flex-1 py-4 bg-rose-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-rose-950 transition-colors shadow-lg"
                      >
                        <FileText className="w-5 h-5" />
                        Gerar Orçamento
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === 'mercadolivre' ? (
                <motion.div 
                  key="ml-calc"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Globe className="w-5 h-5 text-rose-900" />
                      Calculadora Mercado Livre
                    </h2>
                    <button 
                      onClick={() => setShowMlInfo(true)}
                      className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-xl text-rose-900">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-rose-900 uppercase tracking-wider">Preço Sugerido (ML)</p>
                          <p className="text-lg font-bold text-slate-900">
                            {currency} {mlResults.suggestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={suggestMlPrice}
                        className="px-4 py-2 bg-rose-900 text-white rounded-lg text-sm font-bold hover:bg-rose-950 transition-all shadow-sm"
                      >
                        Usar Preço Sugerido
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Preço de Venda ML ({currency})</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-900" />
                            <input
                              type="number"
                              value={mlManualPrice || ''}
                              onChange={(e) => setMlManualPrice(Number(e.target.value))}
                              placeholder={`Base: ${retailPrice.toFixed(2)}`}
                              className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none font-bold text-lg"
                            />
                          </div>
                        </div>

                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Tipo de Anúncio</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleMlTypeChange('classico')}
                              className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                                mlListingType === 'classico' 
                                  ? 'bg-rose-900 text-white border-rose-950' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Clássico
                            </button>
                            <button
                              onClick={() => handleMlTypeChange('premium')}
                              className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                                mlListingType === 'premium' 
                                  ? 'bg-rose-900 text-white border-rose-950' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Premium
                            </button>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1 font-bold">Comissão Manual (%)</label>
                            <input
                              type="number"
                              value={mlCommissionRate}
                              onChange={(e) => setMlCommissionRate(Number(e.target.value))}
                              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Truck className="w-3 h-3" /> Logística e Impostos
                          </h3>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Custo do Frete</label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="number"
                                value={mlShippingCost}
                                onChange={(e) => setMlShippingCost(Number(e.target.value))}
                                className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 italic">Vendedores com reputação pagam parte do frete grátis.</p>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Imposto (%)</label>
                            <input
                              type="number"
                              value={mlTaxRate}
                              onChange={(e) => setMlTaxRate(Number(e.target.value))}
                              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="shopee-calc"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-rose-900" />
                      Calculadora de Venda Shopee
                    </h2>
                    <button 
                      onClick={() => setShowShopeeInfo(true)}
                      className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
                      title="Como as taxas são calculadas?"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Price Suggestion Banner */}
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-xl text-rose-900">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-rose-900 uppercase tracking-wider">Preço Sugerido para Shopee</p>
                          <p className="text-lg font-bold text-slate-900">
                            {currency} {shopeeResults.suggestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={suggestShopeePrice}
                        className="px-4 py-2 bg-rose-900 text-white rounded-lg text-sm font-bold hover:bg-rose-950 transition-all shadow-sm"
                      >
                        Usar Preço Sugerido
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Preço de Venda na Shopee ({currency})</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-900" />
                            <input
                              type="number"
                              value={shopeeManualPrice || ''}
                              onChange={(e) => setShopeeManualPrice(Number(e.target.value))}
                              placeholder={`Base: ${retailPrice.toFixed(2)}`}
                              className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none font-bold text-lg"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 italic">Este é o valor que o cliente verá no anúncio.</p>
                        </div>

                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Truck className="w-3 h-3" /> Custos Logísticos
                          </h3>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Frete Pago pelo Vendedor</label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="number"
                                value={shopeeShipping}
                                onChange={(e) => setShopeeShipping(Number(e.target.value))}
                                className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Valor do frete que você absorve para o cliente.</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-rose-900 flex items-center gap-2">
                            <Megaphone className="w-3 h-3" /> Marketing e Promoção
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Shopee Ads</label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                  type="number"
                                  value={shopeeAds}
                                  onChange={(e) => setShopeeAds(Number(e.target.value))}
                                  className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Cupons/Desc.</label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                  type="number"
                                  value={shopeeDiscount}
                                  onChange={(e) => setShopeeDiscount(Number(e.target.value))}
                                  className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none"
                                />
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 italic">Investimento em anúncios e descontos por venda.</p>
                        </div>

                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Tag className="w-3 h-3" /> Impostos e Notas
                          </h3>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Alíquota de Imposto (%)</label>
                            <select 
                              value={shopeeTaxRate}
                              onChange={(e) => setShopeeTaxRate(Number(e.target.value))}
                              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-900 outline-none bg-white"
                            >
                              <option value={0}>MEI (0%)</option>
                              <option value={4}>Simples Nacional (4%)</option>
                              <option value={6}>Simples Nacional (6%)</option>
                              <option value={10}>Outros (10%)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Grid */}
            <AnimatePresence mode="wait">
              {activeTab === 'direct' || activeTab === 'keychain' ? (
                <div className="space-y-6">
                  <motion.div 
                    key="direct-results"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <Weight className="w-6 h-6 text-slate-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Custo de Produção</span>
                      </div>
                      <div className="text-sm text-slate-500 mb-1">Custo Total (Material + Extras)</div>
                      <div className="text-4xl font-bold tracking-tight text-slate-900">
                        {currency} {totalProductionCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-1 text-sm text-slate-500">
                        <div className="flex justify-between">
                          <span>Material Base ({weight}g):</span>
                          <span className="font-mono">{currency} {materialCost.toFixed(2)}</span>
                        </div>
                        {lossPercentage > 0 && (
                          <div className="flex justify-between text-amber-600 font-medium">
                            <span>Perda/Erro ({lossPercentage}%):</span>
                            <span className="font-mono">{currency} {materialLossCost.toFixed(2)}</span>
                          </div>
                        )}
                        {isKeychainMode && (
                          <>
                            {keychainPurgeCost > 0 && (
                              <div className="flex justify-between text-slate-400">
                                <span>Purga (Material):</span>
                                <span className="font-mono">{currency} {keychainPurgeCost.toFixed(2)}</span>
                              </div>
                            )}
                            {keychainExtrasCost > 0 && (
                              <div className="flex justify-between text-slate-400">
                                <span>Argola/Insumos:</span>
                                <span className="font-mono">{currency} {keychainExtrasCost.toFixed(2)}</span>
                              </div>
                            )}
                          </>
                        )}
                        {useAdvancedCosts && (
                          <>
                            <div className="flex justify-between text-blue-600 font-medium">
                              <span>Tempo ({advancedCosts.totalHours.toFixed(1)}h):</span>
                              <span className="font-mono">{currency} {advancedCosts.labor.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-yellow-600 font-medium">
                              <span>Eletricidade:</span>
                              <span className="font-mono">{currency} {advancedCosts.electricity.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-rose-600 font-medium">
                              <span>Depreciação:</span>
                              <span className="font-mono">{currency} {advancedCosts.depreciation.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between border-t border-slate-50 pt-1 mt-1 font-bold text-slate-700">
                          <span>Total Gasto:</span>
                          <span>{currency} {totalProductionCost.toFixed(2)}</span>
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
                        <span>Lucro: {currency} {(retailPrice - totalProductionCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="opacity-60">Multiplicador: {(retailPrice / totalProductionCost).toFixed(1)}x</span>
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
                        <span>Lucro: {currency} {(wholesalePrice - totalProductionCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="opacity-60">Multiplicador: {(wholesalePrice / totalProductionCost).toFixed(1)}x</span>
                      </div>
                    </motion.div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200"
                  >
                    <div className="flex items-center gap-2 mb-6">
                      <BarChart3 className="w-5 h-5 text-rose-900" />
                      <h3 className="font-bold text-slate-800">Distribuição de Valores ({currency})</h3>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickFormatter={(value) => `${currency}${value}`}
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              fontSize: '12px'
                            }}
                            formatter={(value: any) => [`${currency} ${value.toFixed(2)}`, 'Valor']}
                          />
                          <Bar dataKey="valor" radius={[8, 8, 0, 0]} barSize={60}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                       {chartData.map((item) => (
                         <div key={item.name} className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                           <span className="text-[10px] uppercase font-bold text-slate-400">{item.name}</span>
                           <span className="text-xs font-bold text-slate-700">{currency} {item.valor.toFixed(2)}</span>
                         </div>
                       ))}
                    </div>
                  </motion.div>
                </div>
              ) : activeTab === 'mercadolivre' ? (
                <motion.div 
                  key="ml-results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-yellow-400 rounded-2xl">
                        <Globe className="w-6 h-6 text-slate-900" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Resumo Mercado Livre</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm text-slate-500">Preço de Venda</p>
                          <p className="text-3xl font-bold">{currency} {mlResults.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Lucro Líquido</p>
                          <p className="text-3xl font-bold text-emerald-600">{currency} {mlResults.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500" 
                          style={{ width: `${Math.max(0, Math.min(100, mlResults.margin))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400 uppercase">Margem Líquida</span>
                        <span className="text-emerald-600">{mlResults.margin.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Custo de Produção</span>
                        <span className="font-bold text-slate-700">{currency} {totalProductionCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Comissão ML ({mlListingType})</span>
                        <span className="font-bold text-rose-600">-{currency} {mlResults.commission.toFixed(2)}</span>
                      </div>
                      {mlResults.fixedFee > 0 && (
                        <div className="flex justify-between text-[10px] text-rose-500 italic -mt-2">
                          <span>* Inclui taxa fixa de R$ 6,00 (Preço &lt; R$ 79)</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Impostos ({mlTaxRate}%)</span>
                        <span className="font-bold text-rose-600">-{currency} {mlResults.tax.toFixed(2)}</span>
                      </div>
                      {mlShippingCost > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Frete por sua conta</span>
                          <span className="font-bold text-rose-600">-{currency} {mlShippingCost.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold mb-4">Análise de Lucratividade</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        Ao vender no Mercado Livre, você está pagando <span className="text-white font-bold">{((mlResults.totalFees / mlResults.price) * 100).toFixed(1)}%</span> do valor total em taxas e custos de plataforma.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Recebimento</p>
                        <p className="text-xl font-bold">{currency} {(mlResults.price - mlResults.totalFees).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">ROI (Retorno)</p>
                        <p className="text-xl font-bold">{((mlResults.netProfit / totalProductionCost) * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="shopee-results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <ShoppingBag className="w-6 h-6 text-slate-400" />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Resumo Shopee</span>
                    </div>
                    <div className="text-sm text-slate-500 mb-1">Total de Taxas e Custos</div>
                    <div className="text-4xl font-bold tracking-tight text-slate-900">
                      {currency} {shopeeResults.totalFees.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-1 text-sm text-slate-500">
                      <div className="flex justify-between">
                        <span>Comissão ({shopeeResults.commissionRate}%):</span>
                        <span className="font-mono">{currency} {shopeeResults.commission.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Impostos ({shopeeTaxRate}%):</span>
                        <span className="font-mono">{currency} {shopeeResults.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Outros Custos:</span>
                        <span className="font-mono">{currency} {(shopeeShipping + shopeeAds + shopeeDiscount).toFixed(2)}</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-rose-900 rounded-3xl p-6 text-white shadow-xl shadow-rose-100"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <DollarSign className="w-6 h-6 opacity-80" />
                      <span className="text-xs font-bold uppercase tracking-widest opacity-80">Lucro Líquido</span>
                    </div>
                    <div className="text-sm opacity-80 mb-1">Após todas as taxas</div>
                    <div className="text-4xl font-bold tracking-tight">
                      {currency} {shopeeResults.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-sm">
                      <span>Margem Líquida:</span>
                      <span className="font-bold">{shopeeResults.margin.toFixed(1)}%</span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <TrendingUp className="w-6 h-6 text-rose-900" />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Comparativo</span>
                    </div>
                    <div className="text-sm text-slate-500 mb-1">Recebimento Líquido</div>
                    <div className="text-4xl font-bold tracking-tight text-slate-900">
                      {currency} {(shopeeResults.price - shopeeResults.totalFees).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm text-slate-500">
                      <span>Custo Total:</span>
                      <span>{currency} {totalProductionCost.toFixed(2)}</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
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
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => loadHistoryItem(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-900 hover:bg-rose-100 rounded-lg transition-all"
                            title="Carregar para Calculadora"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteHistoryItem(item.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: 0 }}>{weight}g {lossPercentage > 0 ? `(+ ${lossPercentage}% perda/erro)` : ''}</p>
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

        {/* Mercado Livre Info Popup */}
        <AnimatePresence>
          {showMlInfo && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
              >
                <div className="bg-yellow-400 p-6 text-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Info className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Taxas do Mercado Livre</h2>
                  </div>
                  <button 
                    onClick={() => setShowMlInfo(false)}
                    className="p-2 hover:bg-black/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                  <section className="space-y-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                       <Tag className="w-4 h-4 text-rose-900" />
                       Anúncio Clássico
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Possui exposição moderada. A comissão varia entre 10% e 14% dependendo da categoria do produto no Mercado Livre.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                       <Zap className="w-4 h-4 text-rose-900" />
                       Anúncio Premium
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Máxima exposição e oferece parcelamento sem juros para o comprador. A comissão varia entre 15% e 19%.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                       <DollarSign className="w-4 h-4 text-rose-900" />
                       Custo Fixo (R$ 6,00)
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Produtos com valor inferior a R$ 79,00 pagam uma taxa fixa de R$ 6,00 por unidade vendida, além da comissão por categoria.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                       <Truck className="w-4 h-4 text-rose-900" />
                       Frete Grátis
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Para produtos a partir de R$ 79,00, o frete grátis é obrigatório. O Mercado Livre oferece descontos no custo deste frete baseado na sua reputação como vendedor.
                    </p>
                  </section>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => setShowMlInfo(false)}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                  >
                    Entendi
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Shopee Info Popup */}
        <AnimatePresence>
          {showShopeeInfo && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
              >
                <div className="bg-rose-900 p-6 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Info className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Entendendo as Taxas Shopee</h2>
                  </div>
                  <button 
                    onClick={() => setShowShopeeInfo(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                  <section className="space-y-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-rose-900" />
                      Comissão e Taxa de Pagamento
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      A Shopee cobra uma comissão que já inclui a taxa de processamento de pagamento. O valor varia conforme o preço do produto:
                    </p>
                    <ul className="text-xs space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <li className="flex justify-between"><span>Até R$ 79,99:</span> <span className="font-bold">20% + R$ 4,00</span></li>
                      <li className="flex justify-between"><span>R$ 80,00 a R$ 99,99:</span> <span className="font-bold">14% + R$ 16,00</span></li>
                      <li className="flex justify-between"><span>R$ 100,00 a R$ 199,99:</span> <span className="font-bold">14% + R$ 20,00</span></li>
                      <li className="flex justify-between"><span>Acima de R$ 200,00:</span> <span className="font-bold">14% + R$ 26,00</span></li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-rose-900" />
                      Frete Pago pelo Vendedor
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Se você oferece frete grátis ou descontos no frete, esse valor sai diretamente do seu lucro. Use o campo de logística para simular quanto esse custo impacta sua margem final.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-rose-900" />
                      Marketing (Ads e Cupons)
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <strong>Shopee Ads:</strong> O custo médio que você gasta em anúncios para realizar uma venda.<br/>
                      <strong>Cupons:</strong> O valor do desconto que você oferece e que é absorvido pela sua loja.
                    </p>
                  </section>

                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                    <p className="text-xs text-rose-900 font-medium">
                      💡 <strong>Dica:</strong> Use o "Preço Sugerido" para garantir que você receba o mesmo valor líquido que receberia em uma venda direta fora da plataforma.
                    </p>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => setShowShopeeInfo(false)}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                  >
                    Entendi
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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

        {/* Text Quote Popup */}
        <AnimatePresence>
          {showTextQuotePopup && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
              >
                <div className="bg-emerald-600 p-6 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Personalizar Orçamento (Texto)</h2>
                  </div>
                  <button 
                    onClick={() => setShowTextQuotePopup(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                      onClick={() => handleQuoteTypeChange('whatsapp')}
                      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                        quoteType === 'whatsapp' ? 'bg-white text-rose-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleQuoteTypeChange('instagram')}
                      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                        quoteType === 'instagram' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      Instagram
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">
                    Edite o texto abaixo para personalizar o orçamento antes de enviar ou copiar.
                  </p>
                  <textarea
                    value={textQuote}
                    onChange={(e) => setTextQuote(e.target.value)}
                    className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-800 outline-none font-mono text-sm resize-none custom-scrollbar"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <button
                      onClick={copyToClipboard}
                      className="py-4 bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all border border-slate-200"
                    >
                      <Copy className="w-5 h-5" />
                      Copiar Texto
                    </button>
                    <button
                      onClick={shareWhatsApp}
                      className="py-4 bg-rose-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-rose-950 transition-all shadow-lg"
                    >
                      <Share2 className="w-5 h-5" />
                      Enviar WhatsApp
                    </button>
                  </div>
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
