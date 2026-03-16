import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  writeBatch,
  Timestamp,
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  History, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle,
  Search,
  Filter,
  LogOut,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  TrendingDown,
  Box,
  Trash2,
  Move,
  CheckSquare,
  Square,
  Palette,
  Settings,
  Check,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Loader2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';

// Types
interface AppUser extends User {
  role: 'admin' | 'user';
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Product {
  id: string;
  name: string;
  categoryId: string;
  sku: string;
  price: number;
  quantity: number;
  minStockLevel?: number;
  unit?: string;
  imageUrl?: string;
  tags?: string[];
  lastUpdated?: any;
}

interface Transaction {
  id: string;
  productId: string;
  productName?: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: any;
  notes?: string;
  userId: string;
}

type ThemeColor = 'emerald' | 'blue' | 'rose' | 'amber' | 'violet' | 'indigo';

interface Theme {
  id: ThemeColor;
  name: string;
  primary: string;
  accent: string;
  bg: string;
}

const THEMES: Theme[] = [
  { id: 'emerald', name: 'Emerald', primary: 'bg-emerald-500', accent: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'blue', name: 'Ocean', primary: 'bg-blue-500', accent: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'rose', name: 'Rose', primary: 'bg-rose-500', accent: 'text-rose-500', bg: 'bg-rose-500/10' },
  { id: 'amber', name: 'Amber', primary: 'bg-amber-500', accent: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'violet', name: 'Violet', primary: 'bg-violet-500', accent: 'text-violet-500', bg: 'bg-violet-500/10' },
  { id: 'indigo', name: 'Indigo', primary: 'bg-indigo-500', accent: 'text-indigo-500', bg: 'bg-indigo-500/10' },
];

// Components
interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: AppUser | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentTheme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
}

const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  user, 
  isOpen, 
  setIsOpen,
  currentTheme,
  setTheme
}: SidebarProps) => {
  const menuItems: { id: string, label: string, icon: any, adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Box },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'transactions', label: 'Transactions', icon: History, adminOnly: true },
  ].filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={`
        w-64 bg-zinc-950 text-zinc-400 h-screen fixed left-0 top-0 border-r border-zinc-800 flex flex-col z-50 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-zinc-950">
              <Box size={20} />
            </div>
            <h1 className="text-white font-bold text-xl tracking-tight">StockMaster</h1>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <div className="px-4 mb-4">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Main Menu</p>
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === item.id 
                      ? 'bg-zinc-800 text-white shadow-lg shadow-black/20' 
                      : 'hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <item.icon size={20} className={activeTab === item.id ? 'text-primary' : ''} />
                  <span className="font-medium">{item.label}</span>
                  {activeTab === item.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="ml-auto w-1.5 h-1.5 bg-primary rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 mt-8">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Theme Customization</p>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  title={t.name}
                  className={`
                    h-10 rounded-lg border-2 transition-all flex items-center justify-center
                    ${currentTheme === t.id ? 'border-primary bg-primary/10' : 'border-zinc-800 hover:border-zinc-700'}
                  `}
                >
                  <div className={`w-4 h-4 rounded-full ${t.primary}`} />
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          {user && (
            <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
              <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-zinc-700" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

const Dashboard = ({ products, transactions }: { products: Product[], transactions: Transaction[] }) => {
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.quantity <= (p.minStockLevel || 0));
  const totalStockValue = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard</h2>
          <p className="text-zinc-500 mt-1 italic font-serif">Overview of your inventory status</p>
        </div>
        <div className="md:text-right">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono">Last Updated</p>
          <p className="text-sm text-zinc-300 font-mono">{new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4"
        >
          <div className="p-2 bg-amber-500 rounded-lg text-zinc-950">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-amber-500 font-bold">Low Stock Warning</h4>
            <p className="text-zinc-400 text-sm">There are {lowStockProducts.length} items currently below their minimum stock level.</p>
          </div>
          <button 
            onClick={() => {
              // This is a bit tricky since we are in a subcomponent. 
              // Usually we'd want to navigate to Inventory tab.
              // For now, just a visual indicator.
            }}
            className="hidden sm:block text-xs font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors"
          >
            Review Inventory
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Items', value: totalProducts, icon: Box, color: 'text-blue-400' },
          { label: 'Low Stock', value: lowStockProducts.length, icon: AlertTriangle, color: lowStockProducts.length > 0 ? 'text-amber-400' : 'text-zinc-500' },
          { label: 'Total Value', value: `$${totalStockValue.toLocaleString()}`, icon: TrendingUp, color: 'text-primary' },
          { label: 'Recent Moves', value: transactions.length, icon: History, color: 'text-purple-400' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-zinc-800 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Low Stock Alerts</h3>
            <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-md uppercase tracking-wider">Attention Required</span>
          </div>
          <div className="divide-y divide-zinc-800">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map(product => (
                <div key={product.id} className="p-4 flex items-center gap-4 hover:bg-zinc-800/50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Box size={18} className="text-zinc-700" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{product.name}</p>
                    <p className="text-xs text-zinc-500 font-mono">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-bold">{product.quantity} {product.unit || 'pcs'}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Min: {product.minStockLevel}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-zinc-500 italic font-serif">
                All stock levels are healthy
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
            <button className="text-xs text-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-wider">View All</button>
          </div>
          <div className="divide-y divide-zinc-800">
            {recentTransactions.length > 0 ? (
              recentTransactions.map(tx => {
                const product = products.find(p => p.id === tx.productId);
                return (
                  <div key={tx.id} className="p-4 flex items-center gap-4 hover:bg-zinc-800/50 transition-colors">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product?.imageUrl ? (
                          <img src={product.imageUrl} alt={tx.productName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Box size={18} className="text-zinc-700" />
                        )}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-zinc-900 ${tx.type === 'IN' ? 'bg-emerald-500 text-zinc-950' : 'bg-red-500 text-white'}`}>
                        {tx.type === 'IN' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{tx.productName || 'Unknown Product'}</p>
                      <p className="text-xs text-zinc-500">{tx.date?.toDate().toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.type === 'IN' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-zinc-500 italic font-serif">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Inventory = ({ products, categories, transactions, user }: { products: Product[], categories: Category[], transactions: Transaction[], user: AppUser | null }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'below-min'>('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: Infinity });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [visibleColumns, setVisibleColumns] = useState({
    product: true,
    category: true,
    sku: true,
    price: true,
    stock: true
  });
  
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    sku: '',
    price: 0,
    quantity: 0,
    minStockLevel: 0,
    unit: 'pcs',
    imageUrl: '',
    tags: []
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateImage = async () => {
    if (!formData.name) {
      alert('Please enter a product name first');
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `A professional product photograph of ${formData.name}. High quality, clean background, studio lighting.`,
            },
          ],
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64EncodeString}`;
          setFormData(prev => ({ ...prev, imageUrl }));
          break;
        }
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit for Firestore document
      alert('Image size must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const [txData, setTxData] = useState({
    type: 'IN' as 'IN' | 'OUT',
    quantity: 0,
    notes: ''
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === '' || p.categoryId === categoryFilter;
    const matchesTag = tagFilter === '' || (p.tags && p.tags.includes(tagFilter));
    const matchesStock = stockFilter === 'all' || 
                         (stockFilter === 'in-stock' && p.quantity > (p.minStockLevel || 0)) ||
                         (stockFilter === 'below-min' && p.quantity <= (p.minStockLevel || 0));
    const matchesPrice = p.price >= priceRange.min && p.price <= priceRange.max;
    return matchesSearch && matchesCategory && matchesTag && matchesStock && matchesPrice;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete ${product.name}?`)) return;

    try {
      await deleteDoc(doc(db, 'products', product.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) return;

    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, 'products', id));
      });
      await batch.commit();
      setSelectedIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
    }
  };

  const handleBulkMove = async () => {
    if (!targetCategoryId) return;

    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, 'products', id), {
          categoryId: targetCategoryId,
          lastUpdated: Timestamp.now()
        });
      });
      await batch.commit();
      setSelectedIds([]);
      setIsBulkMoveModalOpen(false);
      setTargetCategoryId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedProduct) {
        await updateDoc(doc(db, 'products', selectedProduct.id), {
          ...formData,
          lastUpdated: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'products'), {
          ...formData,
          lastUpdated: Timestamp.now()
        });
      }
      setIsModalOpen(false);
      setSelectedProduct(null);
      setFormData({ name: '', categoryId: '', sku: '', price: 0, quantity: 0, minStockLevel: 0, unit: 'pcs', imageUrl: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailsModalOpen(true);
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(products.map(p => ({
      Name: p.name,
      SKU: p.sku,
      Price: p.price,
      Quantity: p.quantity,
      MinStockLevel: p.minStockLevel,
      Unit: p.unit,
      CategoryId: p.categoryId
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inventory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          results.data.forEach((row: any) => {
            const newProductRef = doc(collection(db, 'products'));
            batch.set(newProductRef, {
              name: row.Name,
              sku: row.SKU,
              price: parseFloat(row.Price),
              quantity: parseInt(row.Quantity),
              minStockLevel: parseInt(row.MinStockLevel),
              unit: row.Unit,
              categoryId: row.CategoryId,
              lastUpdated: Timestamp.now()
            });
          });
          await batch.commit();
          alert('Import successful');
        } catch (error) {
          console.error('Error importing CSV:', error);
          alert('Error importing CSV');
        }
      }
    });
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const newQuantity = txData.type === 'IN' 
        ? selectedProduct.quantity + txData.quantity 
        : selectedProduct.quantity - txData.quantity;

      if (newQuantity < 0) {
        alert('Insufficient stock');
        return;
      }

      await addDoc(collection(db, 'transactions'), {
        productId: selectedProduct.id,
        type: txData.type,
        quantity: txData.quantity,
        date: Timestamp.now(),
        notes: txData.notes,
        userId: auth.currentUser?.uid
      });

      await updateDoc(doc(db, 'products', selectedProduct.id), {
        quantity: newQuantity,
        lastUpdated: Timestamp.now()
      });

      setIsTxModalOpen(false);
      setTxData({ type: 'IN', quantity: 0, notes: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Inventory</h2>
          <p className="text-zinc-500 mt-1 italic font-serif">Manage your products and stock levels</p>
        </div>
        {user?.role === 'admin' && (
          <>
            <button 
              onClick={() => {
                setSelectedProduct(null);
                setFormData({ name: '', categoryId: '', sku: '', price: 0, quantity: 0, minStockLevel: 0, unit: 'pcs', imageUrl: '', tags: [] });
                setIsModalOpen(true);
              }}
              className="bg-primary hover:bg-primary-hover text-zinc-950 font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-shadow"
            >
              <Plus size={20} />
              Add Product
            </button>
            <button 
              onClick={handleExportCSV}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Upload size={20} />
              Export CSV
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={20} />
              Import CSV
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv" />
          </>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all ${isFilterMenuOpen ? 'text-primary border-primary/50' : 'text-zinc-400'}`}
            >
              <Filter size={18} />
              Filters
            </button>
            
            <AnimatePresence>
              {isFilterMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsFilterMenuOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 p-4 space-y-4"
                  >
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Filters</p>
                    
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Category</label>
                      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white">
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Stock Status</label>
                      <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as any)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white">
                        <option value="all">All</option>
                        <option value="in-stock">In Stock</option>
                        <option value="below-min">Below Minimum</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Min Price</label>
                        <input type="number" value={priceRange.min} onChange={(e) => setPriceRange(prev => ({...prev, min: parseFloat(e.target.value) || 0}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Max Price</label>
                        <input type="number" value={priceRange.max === Infinity ? '' : priceRange.max} onChange={(e) => setPriceRange(prev => ({...prev, max: parseFloat(e.target.value) || Infinity}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-white" />
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
              className={`bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all ${isColumnMenuOpen ? 'text-primary border-primary/50' : 'text-zinc-400'}`}
            >
              <Settings size={18} />
              Columns
            </button>
            
            <AnimatePresence>
              {isColumnMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsColumnMenuOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 p-2 overflow-hidden"
                  >
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest p-2 border-b border-zinc-800 mb-2">Display Columns</p>
                    <div className="space-y-1">
                      {Object.entries(visibleColumns).map(([key, value]) => (
                        <button
                          key={key}
                          onClick={() => setVisibleColumns(prev => ({ ...prev, [key]: !value }))}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors text-sm"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${value ? 'bg-primary border-primary' : 'border-zinc-700'}`}>
                            {value && <Check size={12} className="text-zinc-950" />}
                          </div>
                          <span className={value ? 'text-white' : 'text-zinc-500'}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <CheckSquare className="text-primary" size={20} />
              <span className="text-primary font-bold">{selectedIds.length} items selected</span>
              <button 
                onClick={() => setSelectedIds([])}
                className="text-xs uppercase tracking-widest font-bold text-zinc-500 hover:text-white transition-colors"
              >
                Deselect
              </button>
            </div>
            {user?.role === 'admin' && (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setIsBulkMoveModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg transition-all text-sm font-bold"
                >
                  <Move size={16} />
                  Move
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all text-sm font-bold"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800">
                <th className="px-6 py-4 w-10">
                  <button 
                    onClick={toggleSelectAll}
                    className="text-zinc-500 hover:text-primary transition-colors"
                  >
                    {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                      <CheckSquare size={20} className="text-primary" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                </th>
                {visibleColumns.product && <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Product</th>}
                {visibleColumns.category && <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Category</th>}
                {visibleColumns.sku && <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">SKU</th>}
                {visibleColumns.price && <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Price</th>}
                {visibleColumns.stock && <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Stock</th>}
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredProducts.map(product => (
                <tr 
                  key={product.id} 
                  onClick={() => handleRowClick(product)}
                  className={`hover:bg-zinc-800/30 transition-colors group cursor-pointer ${
                    selectedIds.includes(product.id) 
                      ? 'bg-primary/5' 
                      : product.quantity <= (product.minStockLevel || 0)
                        ? 'bg-amber-500/5'
                        : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(product.id);
                      }}
                      className="text-zinc-500 hover:text-primary transition-colors"
                    >
                      {selectedIds.includes(product.id) ? (
                        <CheckSquare size={20} className="text-primary" />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>
                  </td>
                  {visibleColumns.product && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Box size={18} className="text-zinc-700" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">{product.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">{product.unit || 'pcs'}</p>
                          <div className="flex gap-1 mt-1">
                            {product.tags?.map(tag => (
                              <span key={tag} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.category && (
                    <td className="px-6 py-4 text-zinc-400 text-sm">
                      {categories.find(c => c.id === product.categoryId)?.name || 'Uncategorized'}
                    </td>
                  )}
                  {visibleColumns.sku && <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{product.sku}</td>}
                  {visibleColumns.price && <td className="px-6 py-4 text-white font-medium">${product.price.toLocaleString()}</td>}
                  {visibleColumns.stock && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${product.quantity <= (product.minStockLevel || 0) ? 'text-amber-400' : 'text-primary'}`}>
                          {product.quantity}
                        </span>
                        {product.quantity <= (product.minStockLevel || 0) && (
                          <AlertTriangle size={14} className="text-amber-400" />
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                          setTxData({ type: 'IN', quantity: 0, notes: '' });
                          setIsTxModalOpen(true);
                        }}
                        className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                        title="Stock In/Out"
                      >
                        <ArrowUpRight size={18} />
                      </button>
                      {user?.role === 'admin' && (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProduct(product);
                            }}
                            className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(product);
                              setFormData({
                                name: product.name,
                                categoryId: product.categoryId,
                                sku: product.sku,
                                price: product.price,
                                quantity: product.quantity,
                                minStockLevel: product.minStockLevel || 0,
                                unit: product.unit || 'pcs',
                                imageUrl: product.imageUrl || '',
                                tags: product.tags || []
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Settings size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">{selectedProduct ? 'Edit Product' : 'Add New Product'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Image Section */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Product Image</label>
                  <div className="flex gap-4 items-start">
                    <div className="w-24 h-24 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden relative group">
                      {formData.imageUrl ? (
                        <>
                          <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                          >
                            <X size={20} />
                          </button>
                        </>
                      ) : (
                        <ImageIcon size={32} className="text-zinc-700" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all">
                          <Upload size={14} />
                          Upload
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                        <button 
                          type="button"
                          onClick={handleGenerateImage}
                          disabled={isGenerating || !formData.name}
                          className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-50 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                        >
                          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          Generate
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-tight">
                        Upload a photo or use AI to generate one based on the product name. Max 1MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Product Name</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Category</label>
                    <select 
                      required
                      value={formData.categoryId}
                      onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">SKU</label>
                    <input 
                      required
                      type="text" 
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Price ($)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Unit</label>
                    <input 
                      type="text" 
                      placeholder="pcs, kg, etc."
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Tags (comma separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. electronics, new, sale"
                      value={formData.tags?.join(', ') || ''}
                      onChange={(e) => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '')})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  {!selectedProduct && (
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Initial Stock</label>
                      <input 
                        required
                        type="number" 
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Min Stock Level</label>
                    <input 
                      type="number" 
                      value={formData.minStockLevel}
                      onChange={(e) => setFormData({...formData, minStockLevel: parseInt(e.target.value)})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {selectedProduct ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Move Modal */}
      <AnimatePresence>
        {isBulkMoveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Bulk Move</h3>
                  <p className="text-xs text-zinc-500 mt-1">Moving {selectedIds.length} items</p>
                </div>
                <button onClick={() => setIsBulkMoveModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Target Category</label>
                  <select 
                    required
                    value={targetCategoryId}
                    onChange={(e) => setTargetCategoryId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <button 
                  onClick={handleBulkMove}
                  disabled={!targetCategoryId}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  Move Items
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Product Details</h3>
                <button onClick={() => setIsDetailsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-8">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-48 h-48 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedProduct.imageUrl ? (
                      <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Box size={48} className="text-zinc-700" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="text-2xl font-bold text-white">{selectedProduct.name}</h4>
                      <p className="text-zinc-500 font-mono text-sm">{selectedProduct.sku}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Category</p>
                        <p className="text-white">{categories.find(c => c.id === selectedProduct.categoryId)?.name || 'Uncategorized'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Price</p>
                        <p className="text-white">${selectedProduct.price.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Current Stock</p>
                        <p className={`font-bold ${selectedProduct.quantity <= (selectedProduct.minStockLevel || 0) ? 'text-amber-400' : 'text-primary'}`}>
                          {selectedProduct.quantity} {selectedProduct.unit || 'pcs'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Min Stock Level</p>
                        <p className="text-white">{selectedProduct.minStockLevel || 0} {selectedProduct.unit || 'pcs'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h5 className="text-lg font-bold text-white flex items-center gap-2">
                    <History size={20} className="text-primary" />
                    Transaction History
                  </h5>
                  
                  <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-900/50 border-b border-zinc-800">
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Date</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Type</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Qty</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {transactions
                          .filter(tx => tx.productId === selectedProduct.id)
                          .sort((a, b) => (b.date?.toMillis() || 0) - (a.date?.toMillis() || 0))
                          .map(tx => (
                            <tr key={tx.id} className="text-sm">
                              <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                                {tx.date?.toDate().toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  tx.type === 'IN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className={`px-4 py-3 font-bold ${tx.type === 'IN' ? 'text-emerald-500' : 'text-red-500'}`}>
                                {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                              </td>
                              <td className="px-4 py-3 text-zinc-400 italic text-xs">
                                {tx.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        {transactions.filter(tx => tx.productId === selectedProduct.id).length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-zinc-600 italic">
                              No transactions recorded for this product
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isTxModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Stock Movement</h3>
                  <p className="text-xs text-zinc-500 mt-1">{selectedProduct.name}</p>
                </div>
                <button onClick={() => setIsTxModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleTransaction} className="p-6 space-y-6">
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button 
                    type="button"
                    onClick={() => setTxData({...txData, type: 'IN'})}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${txData.type === 'IN' ? 'bg-emerald-500 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Stock In
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTxData({...txData, type: 'OUT'})}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${txData.type === 'OUT' ? 'bg-red-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Stock Out
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Quantity</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    value={txData.quantity}
                    onChange={(e) => setTxData({...txData, quantity: parseInt(e.target.value)})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Notes (Optional)</label>
                  <textarea 
                    value={txData.notes}
                    onChange={(e) => setTxData({...txData, notes: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 h-24 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className={`w-full font-bold py-4 rounded-xl transition-all shadow-lg ${
                    txData.type === 'IN' 
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20' 
                      : 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
                  }`}
                >
                  Confirm Movement
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Categories = ({ categories }: { categories: Category[] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'categories'), formData);
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'categories');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Categories</h2>
          <p className="text-zinc-500 mt-1 italic font-serif">Organize your inventory by type</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} />
          New Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(category => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={category.id}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-emerald-500/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-zinc-800 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition-all">
                <Tags size={24} />
              </div>
              <ChevronRight size={20} className="text-zinc-700 group-hover:text-zinc-400 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{category.name}</h3>
            <p className="text-zinc-500 text-sm line-clamp-2">{category.description || 'No description provided'}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">New Category</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Category Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 h-32 resize-none"
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Create Category
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Transactions = ({ transactions, products }: { transactions: Transaction[], products: Product[] }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Transactions</h2>
        <p className="text-zinc-500 mt-1 italic font-serif">Historical record of all stock movements</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Product</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Quantity</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {transactions.map(tx => {
                const product = products.find(p => p.id === tx.productId);
                return (
                  <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 text-zinc-400 text-sm">
                      {tx.date?.toDate().toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product?.imageUrl ? (
                            <img src={product.imageUrl} alt={tx.productName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Box size={14} className="text-zinc-700" />
                          )}
                        </div>
                        <p className="text-white font-medium">{tx.productName || 'Unknown Product'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        tx.type === 'IN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`font-bold ${tx.type === 'IN' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-sm italic">
                      {tx.notes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeColor>(() => {
    return (localStorage.getItem('stockmaster-theme') as ThemeColor) || 'emerald';
  });
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('stockmaster-theme', theme);
  }, [theme]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, '_connection_test', 'init'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        const role = userDoc.exists() ? userDoc.data().role : 'user';
        setUser({ ...u, role } as AppUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));

    const unsubTransactions = onSnapshot(
      query(collection(db, 'transactions'), orderBy('date', 'desc')), 
      (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      }, 
      (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
    );

    return () => {
      unsubProducts();
      unsubCategories();
      unsubTransactions();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  // Enrich transactions with product names
  const enrichedTransactions = transactions.map(tx => ({
    ...tx,
    productName: products.find(p => p.id === tx.productId)?.name
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6" data-theme={theme}>
        <div className="max-w-md w-full space-y-8 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex p-4 bg-primary/10 rounded-3xl text-primary mb-4"
          >
            <Box size={64} />
          </motion.div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tighter">StockMaster Pro</h1>
            <p className="text-zinc-500 mt-2 font-serif italic text-lg">Precision inventory for modern business</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full bg-white text-zinc-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
          >
            <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" />
            Continue with Google
          </button>
          <p className="text-zinc-600 text-xs uppercase tracking-widest">Enterprise Grade Security</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300" data-theme={theme}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        currentTheme={theme}
        setTheme={setTheme}
      />
      
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden bg-zinc-950 border-b border-zinc-800 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-zinc-950">
              <Box size={20} />
            </div>
            <h1 className="text-white font-bold text-lg tracking-tight">StockMaster</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-zinc-400 hover:text-white">
            <Menu size={24} />
          </button>
        </header>

        <main className="p-4 md:p-10 max-w-7xl w-full mx-auto flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard products={products} transactions={enrichedTransactions} />}
              {activeTab === 'inventory' && <Inventory products={products} categories={categories} transactions={enrichedTransactions} user={user} />}
              {activeTab === 'categories' && <Categories categories={categories} />}
              {activeTab === 'transactions' && <Transactions transactions={enrichedTransactions} products={products} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
