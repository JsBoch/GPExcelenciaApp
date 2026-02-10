import React, { useEffect, useMemo, useRef } from "react";

/**
 * DetalleGrid: grilla editable tipo Excel
 * - Maneja TAB natural
 * - ENTER agrega fila cuando estás en última columna
 * - Permite pegar filas desde Excel (TSV)
 * - Imagen opcional por fila, con preview
 */
export default function DetalleGrid({
    detalles,
    setDetalles,
    unidadesMedida = [],
}) {
    const tableRef = useRef(null);

    const cols = useMemo(
        () => [
            { key: "cantidad", label: "CANTIDAD", type: "number" },
            { key: "material", label: "MATERIAL", type: "text" },
            { key: "caras", label: "CARAS", type: "number" },
            { key: "ancho", label: "ANCHO", type: "number" },
            { key: "alto", label: "ALTO", type: "number" },
            { key: "unidad_medida", label: "UNIDAD MEDIDA", type: "select" },

            { key: "galaxy_plus", label: "GALAXY PLUS", type: "check" },
            { key: "uv", label: "UV", type: "check" },
            { key: "cnc", label: "CNC", type: "check" },
            { key: "laser", label: "LASER", type: "check" },
            { key: "summa", label: "SUMMA", type: "check" },

            { key: "version", label: "VERSIÓN", type: "text" },
            { key: "acabados", label: "ACABADOS", type: "text" },
            { key: "medida_real", label: "MEDIDA REAL", type: "text" },

            { key: "imagen", label: "IMAGEN", type: "image" },
        ],
        [],
    );

    const newRow = () => ({
        iddetallepedidoproduccion: null,

        cantidad: "",
        material: "",
        caras: "",
        ancho: "",
        alto: "",
        unidad_medida: "",

        galaxy_plus: false,
        uv: false,
        cnc: false,
        laser: false,
        summa: false,

        version: "",
        acabados: "",
        medida_real: "",

        imagen: null,
        imagen_preview: null,
        imagen_ruta: null,

        _deleted: false,
    });

    useEffect(() => {
        // si no hay filas, crea una
        if (!detalles || detalles.length === 0) {
            setDetalles([newRow()]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const recalcRow = (row) => {
        const ancho = parseFloat(row.ancho) || 0;
        const alto = parseFloat(row.alto) || 0;
        const m2 = (ancho * alto).toFixed(2);
        return { ...row, m2 };
    };

    const updateCell = (rowIndex, key, value) => {
        setDetalles((prev) => {
            const copy = [...prev];
            const row = { ...copy[rowIndex], [key]: value };
            copy[rowIndex] = recalcRow(row);
            return copy;
        });
    };

    const addRow = () => {
        setDetalles((prev) => [...prev, newRow()]);
    };

    const removeRow = (rowIndex) => {
        setDetalles((prev) => {
            const copy = [...prev];
            const row = copy[rowIndex];
            // si ya existe en BD -> marcar eliminado para que backend lo borre
            if (row.iddetallepedidoproduccion) {
                copy[rowIndex] = { ...row, _deleted: true };
            } else {
                copy.splice(rowIndex, 1);
            }
            // asegurar al menos 1 fila visible
            const visible = copy.filter((r) => !r._deleted);
            return visible.length ? copy : [newRow()];
        });
    };

    const focusCell = (rowIndex, colIndex) => {
        const el = tableRef.current?.querySelector(
            `[data-r="${rowIndex}"][data-c="${colIndex}"]`,
        );
        if (el) el.focus();
    };

    const onKeyDown = (e, rowIndex, colIndex) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const lastColIndex = cols.length - 1;
            const nextRow = rowIndex + 1;

            if (colIndex === lastColIndex) {
                // si es última columna: si estás en última fila visible, agrega fila
                const visibleRows = detalles.filter((r) => !r._deleted);
                const visibleIndexMap = detalles
                    .map((r, idx) => (!r._deleted ? idx : null))
                    .filter((x) => x !== null);

                const currentVisiblePos = visibleIndexMap.indexOf(rowIndex);
                const isLastVisible =
                    currentVisiblePos === visibleIndexMap.length - 1;

                if (isLastVisible) {
                    addRow();
                    // focus a la primera celda de la nueva fila (después del render)
                    setTimeout(() => {
                        // la nueva fila será el último índice real
                        focusCell(detalles.length, 0);
                    }, 0);
                } else {
                    // mover a la siguiente fila visible, primera columna
                    const nextVisibleRowIndex =
                        visibleIndexMap[currentVisiblePos + 1];
                    focusCell(nextVisibleRowIndex, 0);
                }
            } else {
                // mover a la siguiente columna en la misma fila
                focusCell(rowIndex, colIndex + 1);
            }
        }
    };

    const onPaste = (e, rowIndex, colIndex) => {
        // Pegar desde Excel (TSV)
        const text = e.clipboardData?.getData("text");
        if (!text) return;

        const rows = text
            .trimEnd()
            .split(/\r?\n/)
            .map((r) => r.split("\t"));

        if (rows.length === 1 && rows[0].length === 1) return; // pegado normal

        e.preventDefault();

        setDetalles((prev) => {
            const copy = [...prev];
            let r = rowIndex;

            rows.forEach((cells) => {
                // buscar siguiente fila utilizable (si está borrada, saltar)
                while (copy[r] && copy[r]._deleted) r++;

                if (!copy[r]) copy.push(newRow());

                let c = colIndex;
                const rowObj = { ...copy[r] };

                cells.forEach((cell) => {
                    while (cols[c] && cols[c].type === "image") c++; // no pegar en imagen
                    if (!cols[c]) return;

                    const key = cols[c].key;
                    if (cols[c].type !== "readonly") {
                        rowObj[key] = cell;
                    }
                    c++;
                });

                copy[r] = recalcRow(rowObj);
                r++;
            });

            return copy;
        });

        // foco después del pegado
        setTimeout(() => focusCell(rowIndex, colIndex), 0);
    };

    const handleFile = (rowIndex, file) => {
        if (!file) return;
        const preview = URL.createObjectURL(file);

        setDetalles((prev) => {
            const copy = [...prev];
            const row = { ...copy[rowIndex] };
            row.imagen = file;
            row.imagen_preview = preview;
            // si sube nueva imagen, la ruta vieja se “reemplaza”
            row.imagen_ruta = null;
            copy[rowIndex] = row;
            return copy;
        });
    };

    const visibleDetalles = detalles.filter((r) => !r._deleted);

    return (
        <div>
            <div className="d-flex gap-2 mb-2">
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={addRow}
                >
                    + Fila
                </button>
                <small className="text-muted align-self-center">
                    Tips: TAB para moverte, ENTER para avanzar / crear fila,
                    puedes pegar desde Excel.
                </small>
            </div>

            <div className="table-responsive">
                <table className="table table-bordered table-sm" ref={tableRef}>
                    <thead className="table-light">
                        <tr>
                            {cols.map((c) => (
                                <th
                                    key={c.key}
                                    style={{ whiteSpace: "nowrap" }}
                                >
                                    {c.label}
                                </th>
                            ))}
                            <th style={{ width: 60 }}>Acción</th>
                        </tr>
                    </thead>

                    <tbody>
                        {visibleDetalles.map((row, visibleIndex) => {
                            // obtener el índice real dentro de "detalles"
                            const realIndex = detalles.findIndex(
                                (x, idx) => idx >= 0 && x === row,
                            );

                            return (
                                <tr key={realIndex}>
                                    {cols.map((c, colIndex) => {
                                        if (c.type === "select") {
                                            return (
                                                <td key={c.key}>
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={row[c.key] || ""}
                                                        onChange={(e) =>
                                                            updateCell(
                                                                realIndex,
                                                                c.key,
                                                                e.target.value,
                                                            )
                                                        }
                                                        data-r={realIndex}
                                                        data-c={colIndex}
                                                        onKeyDown={(e) =>
                                                            onKeyDown(
                                                                e,
                                                                realIndex,
                                                                colIndex,
                                                            )
                                                        }
                                                        onPaste={(e) =>
                                                            onPaste(
                                                                e,
                                                                realIndex,
                                                                colIndex,
                                                            )
                                                        }
                                                    >
                                                        <option value="">
                                                            --
                                                        </option>
                                                        {unidadesMedida.map(
                                                            (um) => (
                                                                <option
                                                                    key={
                                                                        um.idunidadmedida
                                                                    }
                                                                    value={
                                                                        um.unidad
                                                                    }
                                                                >
                                                                    {um.unidad}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                </td>
                                            );
                                        }

                                        if (c.type === "readonly") {
                                            return (
                                                <td key={c.key}>
                                                    <input
                                                        className="form-control form-control-sm"
                                                        value={
                                                            row[c.key] ?? "0.00"
                                                        }
                                                        readOnly
                                                        data-r={realIndex}
                                                        data-c={colIndex}
                                                        onKeyDown={(e) =>
                                                            onKeyDown(
                                                                e,
                                                                realIndex,
                                                                colIndex,
                                                            )
                                                        }
                                                        onPaste={(e) =>
                                                            onPaste(
                                                                e,
                                                                realIndex,
                                                                colIndex,
                                                            )
                                                        }
                                                    />
                                                </td>
                                            );
                                        }

                                        if (c.type === "image") {
                                            return (
                                                <td
                                                    key={c.key}
                                                    style={{ minWidth: 120 }}
                                                >
                                                    <div className="d-flex align-items-center gap-2">
                                                        <input
                                                            type="file"
                                                            className="form-control form-control-sm"
                                                            accept="image/*"
                                                            onChange={(e) =>
                                                                handleFile(
                                                                    realIndex,
                                                                    e.target
                                                                        .files?.[0],
                                                                )
                                                            }
                                                            data-r={realIndex}
                                                            data-c={colIndex}
                                                        />
                                                        {(row.imagen_preview ||
                                                            row.imagen_ruta) && (
                                                            <img
                                                                src={
                                                                    row.imagen_preview ||
                                                                    `/images_pedidosproduccion/${row.imagen_ruta}`
                                                                }
                                                                alt="preview"
                                                                style={{
                                                                    width: 32,
                                                                    height: 32,
                                                                    objectFit:
                                                                        "cover",
                                                                    borderRadius: 4,
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        }

                                        if (c.type === "check") {
                                            return (
                                                <td
                                                    key={c.key}
                                                    className="text-center"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            row[c.key] === true
                                                        }
                                                        onChange={(e) =>
                                                            updateCell(
                                                                realIndex,
                                                                c.key,
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        data-r={realIndex}
                                                        data-c={colIndex}
                                                        onKeyDown={(e) =>
                                                            onKeyDown(
                                                                e,
                                                                realIndex,
                                                                colIndex,
                                                            )
                                                        }
                                                    />
                                                </td>
                                            );
                                        }

                                        // text / number
                                        return (
                                            <td key={c.key}>
                                                <input
                                                    className="form-control form-control-sm"
                                                    type={
                                                        c.type === "number"
                                                            ? "number"
                                                            : "text"
                                                    }
                                                    value={row[c.key] ?? ""}
                                                    onChange={(e) =>
                                                        updateCell(
                                                            realIndex,
                                                            c.key,
                                                            e.target.value,
                                                        )
                                                    }
                                                    data-r={realIndex}
                                                    data-c={colIndex}
                                                    onKeyDown={(e) =>
                                                        onKeyDown(
                                                            e,
                                                            realIndex,
                                                            colIndex,
                                                        )
                                                    }
                                                    onPaste={(e) =>
                                                        onPaste(
                                                            e,
                                                            realIndex,
                                                            colIndex,
                                                        )
                                                    }
                                                    step={
                                                        c.type === "number"
                                                            ? "any"
                                                            : undefined
                                                    }
                                                />
                                            </td>
                                        );
                                    })}

                                    <td className="text-center">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => removeRow(realIndex)}
                                            title="Eliminar fila"
                                        >
                                            🗑
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
