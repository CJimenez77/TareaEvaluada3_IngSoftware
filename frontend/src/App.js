import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const api = axios.create({
    baseURL: 'http://localhost:8080/api'
});

function App() {
    const [vista, setVista] = useState('cliente');

    return (
        <div className="min-vh-100 bg-dark text-white">
            <div className="container py-4">
                <nav className="navbar navbar-dark bg-secondary p-3 rounded mb-4 d-flex justify-content-between">
                    <span className="navbar-brand h1 m-0">Mueblería Los Muebles Hermanos S.A.</span>
                    <div>
                        <button
                            className={`btn btn-sm me-2 ${vista === 'cliente' ? 'btn-primary' : 'btn-outline-light'}`}
                            onClick={() => setVista('cliente')}
                        >
                            Vista Cliente
                        </button>
                        <button
                            className={`btn btn-sm ${vista === 'admin' ? 'btn-warning' : 'btn-outline-light'}`}
                            onClick={() => setVista('admin')}
                        >
                            Vista Administrador
                        </button>
                    </div>
                </nav>
                {vista === 'cliente' ? <VistaCliente /> : <VistaAdministrador />}
            </div>
        </div>
    );
}

function VistaCliente() {
    const [muebles, setMuebles] = useState([]);
    const [variantes, setVariantes] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [cotizacionTotal, setCotizacionTotal] = useState(0);

    useEffect(() => {
        obtenerDatos();
    }, []);

    useEffect(() => {
        const calcularTotalLocal = () => {
            if (carrito.length === 0) {
                setCotizacionTotal(0);
                return;
            }

            let totalAcumulado = 0;

            carrito.forEach(articulo => {
                const muebleOriginal = muebles.find(m => m.id === articulo.muebleId);
                if (!muebleOriginal) return;

                let precioUnitarioFinal = muebleOriginal.precioBase;

                articulo.varianteIds.forEach(varId => {
                    const variante = variantes.find(v => v.id === varId);
                    if (variante) {
                        if (variante.tipo === 'PORCENTAJE') {
                            precioUnitarioFinal += (muebleOriginal.precioBase * variante.valor);
                        } else {
                            precioUnitarioFinal += variante.valor;
                        }
                    }
                });

                totalAcumulado += precioUnitarioFinal * articulo.cantidad;
            });

            setCotizacionTotal(totalAcumulado);
        };

        calcularTotalLocal();
    }, [carrito, muebles, variantes]);

    const obtenerDatos = async () => {
        try {
            const respuestaMuebles = await api.get('/muebles');
            const respuestaVariantes = await api.get('/variantes');
            setMuebles(respuestaMuebles.data.filter(m => m.estado === 'ACTIVO'));
            setVariantes(respuestaVariantes.data);
        } catch (error) { console.error(error); }
    };

    const agregarAlCarrito = (muebleId, cantidad, variantesSeleccionadas, nombreMueble) => {
        const cantidadInt = parseInt(cantidad);
        if (cantidadInt <= 0) return alert("La cantidad debe ser mayor a 0");

        const mueble = muebles.find(m => m.id === muebleId);

        const cantidadEnCarrito = carrito.reduce((total, item) => {
            return item.muebleId === muebleId ? total + item.cantidad : total;
        }, 0);

        if ((cantidadEnCarrito + cantidadInt) > mueble.stock) {
            return alert(`Error: Stock insuficiente. Tienes ${cantidadEnCarrito} en el carrito y intentas agregar ${cantidadInt}, pero solo hay ${mueble.stock} disponibles.`);
        }

        const articulo = {
            muebleId,
            cantidad: cantidadInt,
            varianteIds: variantesSeleccionadas,
            _nombreTemp: nombreMueble
        };

        setCarrito([...carrito, articulo]);
    };

    const confirmarVenta = async () => {
        try {
            const respuesta = await api.post('/ventas', carrito);
            alert(`Venta Exitosa\n${respuesta.data.mensaje}\nTotal Pagado: $${Math.round(respuesta.data.totalPagado)}`);
            setCarrito([]);
            obtenerDatos();
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || "Stock insuficiente"));
        }
    };

    return (
        <div>
            <h2 className="mb-4">Catálogo de Productos</h2>
            <div className="row">
                {muebles.map(mueble => (
                    <TarjetaMueble
                        key={mueble.id}
                        mueble={mueble}
                        variantes={variantes}
                        alAgregar={agregarAlCarrito}
                        carrito={carrito}
                    />
                ))}
            </div>

            {carrito.length > 0 && (
                <div className="card mt-4 border-primary shadow sticky-bottom bg-secondary text-white">
                    <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h5 className="m-0">Carrito ({carrito.length} articulos)</h5>
                        <span className="badge bg-warning text-dark fs-5">
                            Total Estimado: ${Math.round(cotizacionTotal)}
                        </span>
                    </div>
                    <div className="card-body">
                        <ul className="list-group mb-3">
                            {carrito.map((articulo, indice) => (
                                <li key={indice} className="list-group-item bg-dark text-white border-secondary d-flex justify-content-between align-items-center">
                                    <span>
                                        <strong>{articulo._nombreTemp}</strong> x {articulo.cantidad}
                                        {articulo.varianteIds.length > 0 && <small className="text-light ms-2">(Con variantes)</small>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <div className="d-flex justify-content-end gap-2">
                            <button className="btn btn-outline-danger" onClick={() => setCarrito([])}>Vaciar Carrito</button>
                            <button className="btn btn-success fw-bold px-4" onClick={confirmarVenta}>
                                Pagar y Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TarjetaMueble({ mueble, variantes, alAgregar }) {
    const [cantidad, setCantidad] = useState(1);
    const [variantesSeleccionadas, setVariantesSeleccionadas] = useState([]);

    const alternarVariante = (id) => {
        variantesSeleccionadas.includes(id)
            ? setVariantesSeleccionadas(variantesSeleccionadas.filter(v => v !== id))
            : setVariantesSeleccionadas([...variantesSeleccionadas, id]);
    };

    return (
        <div className="col-md-4 mb-4">
            <div className={`card h-100 bg-secondary text-white ${mueble.stock === 0 ? 'border-danger' : 'border-light'}`}>
                <div className="card-body">
                    <h5 className="card-title">{mueble.nombre}</h5>
                    <p className="card-text">
                        Precio Base: ${mueble.precioBase} <br/>
                        Stock: <span className={mueble.stock > 5 ? "text-success fw-bold" : "text-danger fw-bold"}>{mueble.stock}</span>
                    </p>
                    {mueble.stock > 0 ? (
                        <div>
                            <div className="mb-2 bg-dark p-2 rounded">
                                <small className="fw-bold d-block mb-1">Extras:</small>
                                {variantes.map(variante => (
                                    <div key={variante.id} className="form-check">
                                        <input className="form-check-input" type="checkbox" onChange={() => alternarVariante(variante.id)} />
                                        <label className="form-check-label small text-light">
                                            {variante.nombre} (+{variante.tipo === 'PORCENTAJE' ? (variante.valor * 100) + '%' : '$' + variante.valor})
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <div className="d-flex mt-3">
                                <input
                                    type="number"
                                    className="form-control bg-dark text-white border-secondary me-2"
                                    value={cantidad}
                                    min="1"
                                    onChange={e => setCantidad(e.target.value)}
                                    style={{width:'80px'}}
                                />
                                <button className="btn btn-primary w-100" onClick={() => alAgregar(mueble.id, cantidad, variantesSeleccionadas, mueble.nombre)}>
                                    Agregar al Carrito
                                </button>
                            </div>
                        </div>
                    ) : <div className="alert alert-danger text-center p-1">Agotado</div>}
                </div>
            </div>
        </div>
    );
}

function VistaAdministrador() {
    const [formularioMueble, setFormularioMueble] = useState({
        nombre_mueble: '', tipo: '', precio_base: '', stock: '', tamano: 'MEDIANO', material: ''
    });
    const [formularioVariante, setFormularioVariante] = useState({ nombre: '', tipo: 'SUMA_FIJA', valor: '' });
    const [muebles, setMuebles] = useState([]);
    const [variantes, setVariantes] = useState([]);

    useEffect(() => { obtenerDatos(); }, []);

    const obtenerDatos = async () => {
        try {
            const respuestaMuebles = await api.get('/muebles');
            const respuestaVariantes = await api.get('/variantes');
            setMuebles(respuestaMuebles.data);
            setVariantes(respuestaVariantes.data);
        } catch (error) { console.error(error); }
    };

    const manejarCreacionMueble = async (e) => {
        e.preventDefault();
        if (formularioMueble.precio_base < 0 || formularioMueble.stock < 0) return alert("Valores no pueden ser negativos");

        try {
            await api.post('/muebles', formularioMueble);
            alert("Mueble creado");
            setFormularioMueble({ nombre_mueble: '', tipo: '', precio_base: '', stock: '', tamano: 'MEDIANO', material: '' });
            obtenerDatos();
        } catch (error) { alert("Error al crear mueble"); }
    };

    const manejarCreacionVariante = async (e) => {
        e.preventDefault();
        if (formularioVariante.valor < 0) return alert("Valor no puede ser negativo");

        let valorFinal = parseFloat(formularioVariante.valor);
        if (formularioVariante.tipo === 'PORCENTAJE') valorFinal = valorFinal / 100;

        try {
            await api.post('/variantes', { ...formularioVariante, valor: valorFinal });
            alert("Variante creada");
            setFormularioVariante({ nombre: '', tipo: 'SUMA_FIJA', valor: '' });
            obtenerDatos();
        } catch (error) { alert("Error al crear variante"); }
    };

    const alternarEstado = async (id, estadoActual) => {
        try {
            const ruta = estadoActual === 'ACTIVO' ? 'desactivar' : 'activar';
            await api.post(`/muebles/${id}/${ruta}`);
            obtenerDatos();
        } catch (error) { alert("Error al cambiar estado"); }
    };

    return (
        <div className="row">
            <div className="col-md-4">
                <div className="card shadow mb-4 bg-secondary text-white">
                    <div className="card-header bg-warning text-dark fw-bold">Crear Mueble</div>
                    <div className="card-body">
                        <form onSubmit={manejarCreacionMueble}>
                            <div className="mb-2">
                                <label className="form-label small fw-bold">Nombre del Mueble</label>
                                <input className="form-control bg-dark text-white border-secondary" placeholder="Ej: Mesa de Centro" required value={formularioMueble.nombre_mueble} onChange={e => setFormularioMueble({...formularioMueble, nombre_mueble: e.target.value})} />
                            </div>
                            <div className="row mb-2">
                                <div className="col">
                                    <label className="form-label small fw-bold">Precio ($)</label>
                                    <input type="number" min="0" className="form-control bg-dark text-white border-secondary" placeholder="0" required value={formularioMueble.precio_base} onChange={e => setFormularioMueble({...formularioMueble, precio_base: e.target.value})} />
                                </div>
                                <div className="col">
                                    <label className="form-label small fw-bold">Stock</label>
                                    <input type="number" min="0" className="form-control bg-dark text-white border-secondary" placeholder="0" required value={formularioMueble.stock} onChange={e => setFormularioMueble({...formularioMueble, stock: e.target.value})} />
                                </div>
                            </div>
                            <div className="mb-2">
                                <label className="form-label small fw-bold">Tipo</label>
                                <input className="form-control bg-dark text-white border-secondary" placeholder="Ej: Interior" value={formularioMueble.tipo} onChange={e => setFormularioMueble({...formularioMueble, tipo: e.target.value})} />
                            </div>
                            <div className="mb-2">
                                <label className="form-label small fw-bold">Material</label>
                                <input className="form-control bg-dark text-white border-secondary" placeholder="Ej: Roble" value={formularioMueble.material} onChange={e => setFormularioMueble({...formularioMueble, material: e.target.value})} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Tamaño</label>
                                <select className="form-select bg-dark text-white border-secondary" value={formularioMueble.tamano} onChange={e => setFormularioMueble({...formularioMueble, tamano: e.target.value})}>
                                    <option value="GRANDE">GRANDE</option>
                                    <option value="MEDIANO">MEDIANO</option>
                                    <option value="PEQUENO">PEQUENO</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-dark w-100 border-light">Guardar Mueble</button>
                        </form>
                    </div>
                </div>

                <div className="card shadow border-info bg-secondary text-white">
                    <div className="card-header bg-info text-white fw-bold">Crear Variante</div>
                    <div className="card-body">
                        <form onSubmit={manejarCreacionVariante}>
                            <div className="mb-2">
                                <label className="form-label small fw-bold">Nombre Variante</label>
                                <input className="form-control bg-dark text-white border-secondary" placeholder="Ej: Barniz Extra" required value={formularioVariante.nombre} onChange={e => setFormularioVariante({...formularioVariante, nombre: e.target.value})} />
                            </div>
                            <div className="mb-2">
                                <label className="form-label small fw-bold">Tipo de Ajuste</label>
                                <select className="form-select bg-dark text-white border-secondary" value={formularioVariante.tipo} onChange={e => setFormularioVariante({...formularioVariante, tipo: e.target.value})}>
                                    <option value="SUMA_FIJA">Suma Fija ($)</option>
                                    <option value="PORCENTAJE">Porcentaje (%)</option>
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Valor</label>
                                <input type="number" min="0" step="0.01" className="form-control bg-dark text-white border-secondary" placeholder={formularioVariante.tipo === 'PORCENTAJE' ? "Ej: 15 (para 15%)" : "Ej: 5000"} required value={formularioVariante.valor} onChange={e => setFormularioVariante({...formularioVariante, valor: e.target.value})} />
                            </div>
                            <button type="submit" className="btn btn-info text-white w-100">Guardar Variante</button>
                        </form>
                    </div>
                </div>
            </div>

            <div className="col-md-8">
                <div className="card shadow bg-secondary text-white">
                    <div className="card-header bg-black text-white">Inventario y Variantes</div>
                    <div className="card-body p-0">
                        <div className="table-responsive" style={{maxHeight: '500px'}}>
                            <table className="table table-dark table-striped table-hover mb-0">
                                <thead className="sticky-top text-white">
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Stock</th>
                                    <th>Estado</th>
                                    <th>Acción</th>
                                </tr>
                                </thead>
                                <tbody>
                                {muebles.map(mueble => (
                                    <tr key={mueble.id} className={mueble.stock === 0 ? 'table-danger' : ''}>
                                        <td>{mueble.id}</td>
                                        <td>{mueble.nombre}</td>
                                        <td>{mueble.stock}</td>
                                        <td><span className={`badge ${mueble.estado === 'ACTIVO' ? 'bg-success' : 'bg-secondary'}`}>{mueble.estado}</span></td>
                                        <td>
                                            <button
                                                className={`btn btn-sm ${mueble.estado === 'ACTIVO' ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                                onClick={() => alternarEstado(mueble.id, mueble.estado)}
                                            >
                                                {mueble.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <h5>Variantes Disponibles:</h5>
                    {variantes.map(variante => (
                        <span key={variante.id} className="badge bg-dark border border-light me-2 p-2 fs-6">
                            {variante.nombre}: {variante.tipo === 'PORCENTAJE' ? (variante.valor * 100) + '%' : '$' + variante.valor}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default App;