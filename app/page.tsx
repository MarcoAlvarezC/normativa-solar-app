'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface NotaPersonal {
  id: string;
  contenido: string;
  importancia: 'Alta' | 'Media' | 'Técnica';
  fecha: string;
}

export interface Norma {
  id: string;
  entidad: 'CREG' | 'UPME' | 'MME' | 'XM';
  categorias: string[];
  numero: string;
  titulo: string;
  resumen: string;
  linkOficial: string;
  fechaEmision: string;
  notasPersonales: NotaPersonal[];
}

const CATEGORIAS_INICIALES = ['AGGE', 'AGPE', 'Proyecto de redes'];

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [entidadSeleccionada, setEntidadSeleccionada] = useState<string>('TODAS');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('TODAS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [normas, setNormas] = useState<Norma[]>([]);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>(CATEGORIAS_INICIALES);
  const [normaActiva, setNormaActiva] = useState<Norma | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  
  // Estados para Login
  const [mostrarModalLogin, setMostrarModalLogin] = useState<boolean>(false);
  const [emailLogin, setEmailLogin] = useState<string>('');
  const [passwordLogin, setPasswordLogin] = useState<string>('');
  const [errorLogin, setErrorLogin] = useState<string | null>(null);
  const [cargandoLogin, setCargandoLogin] = useState<boolean>(false);

  // Estados para Notas
  const [nuevaNotaTexto, setNuevaNotaTexto] = useState<string>('');
  const [nuevaNotaImportancia, setNuevaNotaImportancia] = useState<'Alta' | 'Media' | 'Técnica'>('Media');

  // Estados para Modal Crear y Edición de Resumen
  const [mostrarModalCrear, setMostrarModalCrear] = useState<boolean>(false);
  const [editandoResumen, setEditandoResumen] = useState<boolean>(false);
  const [nuevoResumenTemp, setNuevoResumenTemp] = useState<string>('');

  // Formulario Crear
  const [nuevaEntidad, setNuevaEntidad] = useState<'CREG' | 'UPME' | 'MME' | 'XM'>('CREG');
  const [categoriasSeleccionadasInput, setCategoriasSeleccionadasInput] = useState<string[]>(['AGPE']);
  const [customCatInput, setCustomCatInput] = useState<string>('');
  const [nuevoNumero, setNuevoNumero] = useState<string>('');
  const [nuevoTitulo, setNuevoTitulo] = useState<string>('');
  const [nuevoResumen, setNuevoResumen] = useState<string>('');
  const [nuevoLink, setNuevoLink] = useState<string>('');
  const [nuevaFecha, setNuevaFecha] = useState<string>('');

  useEffect(() => {
    setNuevaFecha(new Date().toISOString().split('T')[0]);

    const temaGuardado = localStorage.getItem('normativa_solar_theme');
    if (temaGuardado !== null) {
      setDarkMode(temaGuardado === 'dark');
    }

    // Listener para verificar sesión en Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    cargarDatosSupabase();

    return () => subscription.unsubscribe();
  }, []);

  const cargarDatosSupabase = async () => {
    setCargando(true);
    try {
      const { data: normasDB, error: errorNormas } = await supabase
        .from('normas')
        .select('*')
        .order('created_at', { ascending: false });

      if (errorNormas) throw errorNormas;

      const { data: notasDB, error: errorNotas } = await supabase
        .from('notas')
        .select('*');

      if (errorNotas) throw errorNotas;

      const normasEstructuradas: Norma[] = (normasDB || []).map((n) => {
        const notasAsociadas: NotaPersonal[] = (notasDB || [])
          .filter((nota) => nota.norma_id === n.id)
          .map((nota) => ({
            id: nota.id,
            contenido: nota.contenido,
            importancia: (nota.importancia as 'Alta' | 'Media' | 'Técnica') || 'Media',
            fecha: nota.fecha
          }));

        return {
          id: n.id,
          entidad: n.entidad,
          categorias: n.categorias || ['AGPE'],
          numero: n.numero,
          titulo: n.titulo,
          resumen: n.resumen || '',
          linkOficial: n.link_oficial || '',
          fechaEmision: n.fecha_emision,
          notasPersonales: notasAsociadas
        };
      });

      setNormas(normasEstructuradas);
      if (normasEstructuradas.length > 0) {
        setNormaActiva(normasEstructuradas[0]);
      }

      const todasCategorias = Array.from(
        new Set([...CATEGORIAS_INICIALES, ...normasEstructuradas.flatMap((n) => n.categorias)])
      );
      setCategoriasDisponibles(todasCategorias);
    } catch (error) {
      console.error('Error al cargar datos desde Supabase:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargandoLogin(true);
    setErrorLogin(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: emailLogin,
      password: passwordLogin,
    });

    if (error) {
      setErrorLogin('Credenciales inválidas o correo no registrado.');
    } else {
      setMostrarModalLogin(false);
      setEmailLogin('');
      setPasswordLogin('');
    }
    setCargandoLogin(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const toggleTheme = () => {
    const nuevoEstado = !darkMode;
    setDarkMode(nuevoEstado);
    localStorage.setItem('normativa_solar_theme', nuevoEstado ? 'dark' : 'light');
  };

  const toggleCategoriaInput = (cat: string) => {
    if (categoriasSeleccionadasInput.includes(cat)) {
      if (categoriasSeleccionadasInput.length > 1) {
        setCategoriasSeleccionadasInput(categoriasSeleccionadasInput.filter(c => c !== cat));
      }
    } else {
      setCategoriasSeleccionadasInput([...categoriasSeleccionadasInput, cat]);
    }
  };

  const agregarCategoriaPersonalizada = () => {
    if (!customCatInput.trim()) return;
    const nueva = customCatInput.trim();
    if (!categoriasDisponibles.includes(nueva)) {
      setCategoriasDisponibles([...categoriasDisponibles, nueva]);
    }
    if (!categoriasSeleccionadasInput.includes(nueva)) {
      setCategoriasSeleccionadasInput([...categoriasSeleccionadasInput, nueva]);
    }
    setCustomCatInput('');
  };

  const normasFiltradas = normas.filter((norma) => {
    const coincideEntidad = entidadSeleccionada === 'TODAS' || norma.entidad === entidadSeleccionada;
    const coincideCategoria = categoriaSeleccionada === 'TODAS' || norma.categorias.includes(categoriaSeleccionada);
    
    const busquedaLower = busqueda.toLowerCase().trim();
    const coincideTextoNorma = norma.numero.toLowerCase().includes(busquedaLower) ||
                               norma.titulo.toLowerCase().includes(busquedaLower) ||
                               norma.resumen.toLowerCase().includes(busquedaLower) ||
                               norma.categorias.some(c => c.toLowerCase().includes(busquedaLower));
                               
    const coincideEnNotas = norma.notasPersonales.some((nota) =>
      nota.contenido.toLowerCase().includes(busquedaLower)
    );

    return coincideEntidad && coincideCategoria && (coincideTextoNorma || coincideEnNotas);
  });

  const handleAgregarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaNotaTexto.trim() || !normaActiva || !session) return;

    const nuevaNotaObj = {
      id: Date.now().toString(),
      norma_id: normaActiva.id,
      contenido: nuevaNotaTexto,
      importancia: nuevaNotaImportancia,
      fecha: new Date().toISOString().split('T')[0]
    };

    const { error } = await supabase.from('notas').insert([nuevaNotaObj]);

    if (error) {
      console.error('Error al agregar nota:', error);
      alert('Error de permisos o conexión al guardar la nota.');
      return;
    }

    const notaParaEstado: NotaPersonal = {
      id: nuevaNotaObj.id,
      contenido: nuevaNotaObj.contenido,
      importancia: nuevaNotaObj.importancia,
      fecha: nuevaNotaObj.fecha
    };

    const normasActualizadas = normas.map((n) => {
      if (n.id === normaActiva.id) {
        return { ...n, notasPersonales: [...n.notasPersonales, notaParaEstado] };
      }
      return n;
    });

    setNormas(normasActualizadas);
    setNormaActiva({ ...normaActiva, notasPersonales: [...normaActiva.notasPersonales, notaParaEstado] });
    setNuevaNotaTexto('');
  };

  const handleEliminarNota = async (notaId: string) => {
    if (!normaActiva || !session) return;

    const { error } = await supabase.from('notas').delete().eq('id', notaId);

    if (error) {
      console.error('Error al eliminar nota:', error);
      return;
    }

    const notasFiltradas = normaActiva.notasPersonales.filter((n) => n.id !== notaId);
    const normasActualizadas = normas.map((n) => {
      if (n.id === normaActiva.id) {
        return { ...n, notasPersonales: notasFiltradas };
      }
      return n;
    });

    setNormas(normasActualizadas);
    setNormaActiva({ ...normaActiva, notasPersonales: notasFiltradas });
  };

  const handleCrearNorma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNumero.trim() || !nuevoTitulo.trim() || categoriasSeleccionadasInput.length === 0 || !session) return;

    const nuevaNormaObj = {
      id: Date.now().toString(),
      entidad: nuevaEntidad,
      categorias: categoriasSeleccionadasInput,
      numero: nuevoNumero,
      titulo: nuevoTitulo,
      resumen: nuevoResumen || 'Sin resumen registrado.',
      link_oficial: nuevoLink || 'https://www.google.com',
      fecha_emision: nuevaFecha || new Date().toISOString().split('T')[0]
    };

    const { error } = await supabase.from('normas').insert([nuevaNormaObj]);

    if (error) {
      console.error('Error al crear resolución:', error);
      alert('Error de permisos al guardar la resolución en Supabase.');
      return;
    }

    const normaEstado: Norma = {
      id: nuevaNormaObj.id,
      entidad: nuevaNormaObj.entidad,
      categorias: nuevaNormaObj.categorias,
      numero: nuevaNormaObj.numero,
      titulo: nuevaNormaObj.titulo,
      resumen: nuevaNormaObj.resumen,
      linkOficial: nuevaNormaObj.link_oficial,
      fechaEmision: nuevaNormaObj.fecha_emision,
      notasPersonales: []
    };

    const normasActualizadas = [normaEstado, ...normas];
    setNormas(normasActualizadas);
    setNormaActiva(normaEstado);

    setNuevoNumero('');
    setNuevoTitulo('');
    setNuevoResumen('');
    setNuevoLink('');
    setCategoriasSeleccionadasInput(['AGPE']);
    setMostrarModalCrear(false);
  };

  const handleEliminarNorma = async (normaId: string) => {
    if (!session || !confirm('¿Estás seguro de eliminar esta resolución y todas sus notas asociadas?')) return;

    const { error } = await supabase.from('normas').delete().eq('id', normaId);

    if (error) {
      console.error('Error al eliminar norma:', error);
      return;
    }

    const normasActualizadas = normas.filter((n) => n.id !== normaId);
    setNormas(normasActualizadas);

    if (normaActiva?.id === normaId) {
      setNormaActiva(normasActualizadas.length > 0 ? normasActualizadas[0] : null);
    }
  };

  const handleGuardarResumen = async () => {
    if (!normaActiva || !session) return;

    const { error } = await supabase
      .from('normas')
      .update({ resumen: nuevoResumenTemp })
      .eq('id', normaActiva.id);

    if (error) {
      console.error('Error al actualizar resumen:', error);
      return;
    }

    const normasActualizadas = normas.map((n) => {
      if (n.id === normaActiva.id) {
        return { ...n, resumen: nuevoResumenTemp };
      }
      return n;
    });

    setNormas(normasActualizadas);
    setNormaActiva({ ...normaActiva, resumen: nuevoResumenTemp });
    setEditandoResumen(false);
  };

  const estilosImportancia = (imp: 'Alta' | 'Media' | 'Técnica') => {
    switch (imp) {
      case 'Alta':
        return darkMode ? 'bg-red-950/40 border-l-4 border-red-500 text-red-200' : 'bg-red-50 border-l-4 border-red-500 text-red-900';
      case 'Media':
        return darkMode ? 'bg-sky-950/40 border-l-4 border-sky-500 text-sky-200' : 'bg-sky-50 border-l-4 border-sky-500 text-sky-900';
      case 'Técnica':
        return darkMode ? 'bg-emerald-950/40 border-l-4 border-emerald-500 text-emerald-200' : 'bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900';
      default:
        return darkMode ? 'bg-slate-800 border-l-4 border-slate-500 text-slate-200' : 'bg-slate-50 border-l-4 border-slate-400 text-slate-800';
    }
  };

  const badgeImportancia = (imp: 'Alta' | 'Media' | 'Técnica') => {
    switch (imp) {
      case 'Alta':
        return darkMode ? 'bg-red-900/60 text-red-200 border border-red-700' : 'bg-red-100 text-red-800 border border-red-300';
      case 'Media':
        return darkMode ? 'bg-sky-900/60 text-sky-200 border border-sky-700' : 'bg-sky-100 text-sky-800 border border-sky-300';
      case 'Técnica':
        return darkMode ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700' : 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    }
  };

  return (
    <div className={`min-h-screen p-6 font-sans antialiased transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Cabecera */}
      <header className={`max-w-7xl mx-auto mb-8 border-b pb-5 flex flex-col md:flex-row md:justify-between md:items-center gap-4 ${
        darkMode ? 'border-slate-800' : 'border-slate-300'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Gestor Normativo de Ingeniería Solar</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Directorio Aplicable Proyectos AGPE y AGGE</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Compendio de resoluciones UPME, CREG, MME y XM con sincronización en la nube (Supabase).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${
              darkMode 
                ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700' 
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {darkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
          </button>

          {/* Autenticación Administrador */}
          {session ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-3 py-2.5 rounded-xl">
                👤 Admin Activo
              </span>
              <button
                onClick={handleLogout}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold border ${
                  darkMode ? 'bg-slate-800 border-slate-700 hover:bg-red-950/60 hover:text-red-300 hover:border-red-800' : 'bg-slate-200 border-slate-300 hover:bg-red-100 hover:text-red-700'
                }`}
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <button
              onClick={() => setMostrarModalLogin(true)}
              className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                darkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
            >
              🔑 Acceso Admin
            </button>
          )}

          {/* Botón Añadir (Solo visible para Admin) */}
          {session && (
            <button
              onClick={() => setMostrarModalCrear(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold px-5 py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              ➕ Añadir Resolución
            </button>
          )}
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel Izquierdo */}
        <div className={`lg:col-span-1 space-y-5 p-5 rounded-2xl border shadow-xl backdrop-blur-md transition-colors ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Buscador Inteligente
            </label>
            <input
              type="text"
              placeholder="Buscar norma, tema, palabra en notas..."
              className={`w-full p-3 border rounded-xl text-sm outline-none transition-all shadow-inner ${
                darkMode 
                  ? 'bg-slate-950 border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-amber-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500'
              }`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Filtrar por Entidad
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['TODAS', 'CREG', 'UPME', 'MME', 'XM'].map((ent) => (
                <button
                  key={ent}
                  onClick={() => setEntidadSeleccionada(ent)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    entidadSeleccionada === ent
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                      : darkMode ? 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {ent}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Filtrar por Categoría
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoriaSeleccionada('TODAS')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  categoriaSeleccionada === 'TODAS'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-black'
                    : darkMode ? 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                TODAS
              </button>
              {categoriasDisponibles.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaSeleccionada(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    categoriaSeleccionada === cat
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-black'
                      : darkMode ? 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <hr className={darkMode ? 'border-slate-800' : 'border-slate-200'} />

          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Normativas Registradas ({normasFiltradas.length})
            </h3>
            
            {cargando ? (
              <p className="text-xs text-amber-400 p-6 text-center animate-pulse">Conectando con Supabase...</p>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {normasFiltradas.length === 0 ? (
                  <p className="text-xs text-slate-500 p-6 text-center italic">No hay resoluciones registradas en la nube.</p>
                ) : (
                  normasFiltradas.map((norma) => (
                    <div
                      key={norma.id}
                      onClick={() => setNormaActiva(norma)}
                      className={`group relative p-3.5 rounded-xl border cursor-pointer transition-all duration-300 overflow-hidden ${
                        normaActiva?.id === norma.id 
                          ? darkMode 
                            ? 'bg-slate-800 border-amber-500 shadow-lg border-l-4 border-l-amber-400' 
                            : 'bg-amber-50 border-amber-500 shadow-md border-l-4 border-l-amber-600'
                          : darkMode 
                            ? 'bg-slate-950/60 border-slate-800 hover:border-amber-500/60 hover:bg-slate-800/60' 
                            : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/30'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5 relative z-10">
                        <div className="flex flex-wrap gap-1">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                            darkMode ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}>
                            {norma.entidad}
                          </span>
                          {norma.categorias?.map((c) => (
                            <span key={c} className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                              darkMode ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                              {c}
                            </span>
                          ))}
                        </div>
                        <span className={`text-[10px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{norma.fechaEmision}</span>
                      </div>
                      <h4 className={`font-bold text-sm mt-1 transition-transform duration-300 group-hover:translate-x-1 ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        ⚡ {norma.numero}
                      </h4>
                      <p className={`text-xs line-clamp-2 mt-1 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {norma.titulo}
                      </p>

                      {busqueda.trim() !== '' && norma.notasPersonales.some(n => n.contenido.toLowerCase().includes(busqueda.toLowerCase())) && (
                        <span className="inline-block mt-2 text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-md">
                          📌 Coincidencia en nota
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel Derecho */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border shadow-xl backdrop-blur-md transition-colors ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {normaActiva ? (
            <div className="space-y-6">
              <div className={`flex justify-between items-start border-b pb-5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                      darkMode ? 'bg-blue-900/80 text-blue-200 border-blue-700' : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}>
                      {normaActiva.entidad}
                    </span>
                    {normaActiva.categorias?.map((c) => (
                      <span key={c} className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                        darkMode ? 'bg-emerald-900/80 text-emerald-200 border-emerald-700' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}>
                        {c}
                      </span>
                    ))}
                    <span className={`text-xs font-mono ml-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Emitida: {normaActiva.fechaEmision}
                    </span>
                  </div>
                  <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{normaActiva.numero}</h2>
                  <p className={`font-medium text-sm mt-1 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {normaActiva.titulo}
                  </p>
                  <a
                    href={normaActiva.linkOficial}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-amber-500 hover:underline"
                  >
                    🔗 Ver documento original en sitio oficial &rarr;
                  </a>
                </div>

                {session && (
                  <button
                    onClick={() => handleEliminarNorma(normaActiva.id)}
                    title="Eliminar esta resolución"
                    className="text-xs text-red-400 hover:text-white bg-red-950/60 hover:bg-red-600 border border-red-800 px-3.5 py-2 rounded-xl transition-all font-bold shadow"
                  >
                    🗑️ Eliminar Norma
                  </button>
                )}
              </div>

              {/* Resumen */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Resumen Ejecutivo / Análisis
                  </h4>
                  {session && !editandoResumen && (
                    <button
                      onClick={() => {
                        setNuevoResumenTemp(normaActiva.resumen);
                        setEditandoResumen(true);
                      }}
                      className="text-xs text-amber-500 hover:underline font-bold flex items-center gap-1"
                    >
                      ✏️ Editar Resumen
                    </button>
                  )}
                </div>

                {editandoResumen ? (
                  <div className="space-y-3">
                    <textarea
                      rows={4}
                      className={`w-full p-3.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 ${
                        darkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                      value={nuevoResumenTemp}
                      onChange={(e) => setNuevoResumenTemp(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditandoResumen(false)}
                        className={`px-4 py-1.5 text-xs rounded-lg font-bold transition-all ${
                          darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleGuardarResumen}
                        className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-extrabold shadow transition-all"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4.5 rounded-xl border text-sm leading-relaxed shadow-inner ${
                    darkMode ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    {normaActiva.resumen}
                  </div>
                )}
              </div>

              <hr className={darkMode ? 'border-slate-800' : 'border-slate-200'} />

              {/* Notas */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Notas de Apunte y Trabajo
                  </h4>
                  <span className={`text-xs font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    ({normaActiva.notasPersonales.length} notas)
                  </span>
                </div>
                
                <div className="space-y-3 mb-5">
                  {normaActiva.notasPersonales.length === 0 ? (
                    <p className={`text-xs italic p-4 text-center rounded-xl border ${
                      darkMode ? 'text-slate-500 bg-slate-950/40 border-slate-800' : 'text-slate-400 bg-slate-50 border-slate-200'
                    }`}>
                      No hay notas de apunte registradas para esta resolución.
                    </p>
                  ) : (
                    normaActiva.notasPersonales.map((nota) => {
                      const esCoincidencia = busqueda.trim() !== '' && nota.contenido.toLowerCase().includes(busqueda.toLowerCase());
                      return (
                        <div
                          key={nota.id}
                          className={`p-4 rounded-xl transition-all shadow-md flex justify-between items-start gap-3 ${estilosImportancia(nota.importancia)} ${
                            esCoincidencia ? 'ring-2 ring-amber-400 font-semibold' : ''
                          }`}
                        >
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeImportancia(nota.importancia)}`}>
                                ⚡ Prioridad: {nota.importancia}
                              </span>
                              <span className="text-[10px] opacity-70 font-mono">{nota.fecha}</span>
                            </div>
                            <p className="text-sm leading-relaxed">{nota.contenido}</p>
                          </div>

                          {session && (
                            <button
                              onClick={() => handleEliminarNota(nota.id)}
                              title="Eliminar nota"
                              className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900/20 transition-colors text-xs font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Formulario Agregar Nota (Solo visible para Admin) */}
                {session ? (
                  <form onSubmit={handleAgregarNota} className={`p-4 rounded-xl border space-y-3 shadow-inner ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Agregar nueva nota técnica o recordatorio:
                      </label>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Prioridad:</span>
                        <select
                          className={`text-xs border rounded-lg px-2.5 py-1 outline-none font-semibold ${
                            darkMode ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-white text-slate-800 border-slate-300'
                          }`}
                          value={nuevaNotaImportancia}
                          onChange={(e) => setNuevaNotaImportancia(e.target.value as any)}
                        >
                          <option value="Alta">🔴 Alta (Crítica)</option>
                          <option value="Media">🔵 Media (Importante)</option>
                          <option value="Técnica">🟢 Técnica (General)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Escribe tu nota, requisito, artículo o observación clave..."
                        className={`flex-1 p-3 border rounded-xl text-xs outline-none ${
                          darkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                        }`}
                        value={nuevaNotaTexto}
                        onChange={(e) => setNuevaNotaTexto(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs px-5 py-3 rounded-xl font-extrabold shadow-md transition-all flex items-center gap-1.5"
                      >
                        💾 Guardar Nota
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className={`p-3 rounded-xl border text-center text-xs font-semibold ${
                    darkMode ? 'bg-slate-950/50 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    🔒 Para agregar notas o editar resoluciones, debes iniciar sesión como administrador.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`h-full min-h-[400px] flex flex-col items-center justify-center text-sm space-y-2 ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <span className="text-3xl">📂</span>
              <p>Selecciona una norma del panel izquierdo para leer su contenido y notas.</p>
            </div>
          )}
        </div>

      </main>

      {/* Modal de Login Admin */}
      {mostrarModalLogin && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className={`border rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black">Acceso Administrador</h3>
              <button
                onClick={() => setMostrarModalLogin(false)}
                className="text-xs font-bold px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {errorLogin && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl font-medium">
                ⚠️ {errorLogin}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Correo Electrónico (Supabase)</label>
                <input
                  type="email"
                  required
                  placeholder="admin@ejemplo.com"
                  className={`w-full p-3 border rounded-xl text-xs outline-none ${
                    darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                  value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className={`w-full p-3 border rounded-xl text-xs outline-none ${
                    darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                  value={passwordLogin}
                  onChange={(e) => setPasswordLogin(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={cargandoLogin}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg transition-all"
                >
                  {cargandoLogin ? 'Verificando...' : 'Iniciar Sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Resolución */}
      {mostrarModalCrear && session && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className={`border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="text-lg font-black">Añadir Nueva Resolución</h3>
              <button
                onClick={() => setMostrarModalCrear(false)}
                className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                  darkMode ? 'text-slate-400 hover:text-white bg-slate-800' : 'text-slate-600 hover:text-black bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearNorma} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Entidad Reguladora</label>
                  <select
                    className={`w-full p-3 border rounded-xl text-xs font-semibold outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                    value={nuevaEntidad}
                    onChange={(e) => setNuevaEntidad(e.target.value as any)}
                  >
                    <option value="CREG">CREG</option>
                    <option value="UPME">UPME</option>
                    <option value="MME">MME</option>
                    <option value="XM">XM</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Fecha de Emisión</label>
                  <input
                    type="date"
                    className={`w-full p-3 border rounded-xl text-xs font-semibold outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Categorías / Tipos de Proyecto (Selecciona una o varias)
                </label>
                <div className={`flex flex-wrap gap-1.5 p-3 border rounded-xl mb-2 ${
                  darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-300'
                }`}>
                  {categoriasDisponibles.map((cat) => {
                    const seleccionado = categoriasSeleccionadasInput.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategoriaInput(cat)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          seleccionado
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                            : darkMode ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {seleccionado ? '✓ ' : '+ '} {cat}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nueva categoría (ej: Subestaciones)..."
                    className={`flex-1 p-2.5 border rounded-xl text-xs outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
                    }`}
                    value={customCatInput}
                    onChange={(e) => setCustomCatInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={agregarCategoriaPersonalizada}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs px-4 py-2 rounded-xl font-bold transition-all shadow"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Número de Resolución</label>
                  <input
                    type="text"
                    placeholder="Ej: CREG 075 de 2021"
                    required
                    className={`w-full p-3 border rounded-xl text-xs outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
                    }`}
                    value={nuevoNumero}
                    onChange={(e) => setNuevoNumero(e.target.value)}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Título o Asunto Principal</label>
                  <input
                    type="text"
                    placeholder="Breve descripción..."
                    required
                    className={`w-full p-3 border rounded-xl text-xs outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
                    }`}
                    value={nuevoTitulo}
                    onChange={(e) => setNuevoTitulo(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Resumen Ejecutivo</label>
                <textarea
                  rows={3}
                  placeholder="Detalles clave o artículos importantes..."
                  className={`w-full p-3 border rounded-xl text-xs outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
                  }`}
                  value={nuevoResumen}
                  onChange={(e) => setNuevoResumen(e.target.value)}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Enlace Oficial (URL)</label>
                <input
                  type="url"
                  placeholder="https://www.creg.gov.co/..."
                  className={`w-full p-3 border rounded-xl text-xs outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
                  }`}
                  value={nuevoLink}
                  onChange={(e) => setNuevoLink(e.target.value)}
                />
              </div>

              <div className={`flex justify-end gap-3 pt-3 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setMostrarModalCrear(false)}
                  className={`px-5 py-2.5 text-xs rounded-xl font-bold transition-all ${
                    darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-extrabold shadow-lg transition-all"
                >
                  Guardar Resolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}   