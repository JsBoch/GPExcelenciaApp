import React, { useState } from "react";
import Header from "./Header";
import LogisticaBoard from "./LogisticaBoard";
import LogisticaCalendario from "./LogisticaCalendario";

export default function LogisticaProduccionMonitor() {
    const [vista, setVista] = useState("board");

    return (
        <div className="mt-4 px-3 px-md-4">
            <div className="card">
                <Header title="Monitor de Logística y Producción" />

                <div className="card-body">
                    <div className="mb-3 d-flex gap-2">
                        <button
                            className={`btn btn-sm ${
                                vista === "board"
                                    ? "btn-primary"
                                    : "btn-outline-primary"
                            }`}
                            onClick={() => setVista("board")}
                        >
                            Board
                        </button>

                        <button
                            className={`btn btn-sm ${
                                vista === "calendario"
                                    ? "btn-primary"
                                    : "btn-outline-primary"
                            }`}
                            onClick={() => setVista("calendario")}
                        >
                            Calendario
                        </button>
                    </div>

                    {vista === "board" && <LogisticaBoard />}
                    {vista === "calendario" && <LogisticaCalendario />}
                </div>
            </div>
        </div>
    );
}