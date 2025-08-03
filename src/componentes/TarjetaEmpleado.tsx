interface Empleado {
  id: number;
  nombre: string;
  email: string;
  especialidad?: string;
}

const TarjetaEmpleado = ({ empleado }: { empleado: Empleado }) => {
  // Sacamos iniciales del nombre para mostrar en el avatar
  const iniciales = empleado.nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-md hover:shadow-lg hover:scale-[1.015] transition-all duration-300 animate-in fade-in slide-in-from-bottom">
      
      {/* Avatar e info principal */}
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 rounded-full bg-primary-light text-primary-dark font-bold flex items-center justify-center mr-4 shadow-sm">
          {iniciales}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground leading-tight">{empleado.nombre}</h3>
          {empleado.especialidad && (
            <span className="text-sm text-primary font-medium">{empleado.especialidad}</span>
          )}
        </div>
      </div>

      {/* Datos de contacto */}
      <div className="text-sm text-muted-foreground space-y-1 mb-4">
        <p>{empleado.email}</p>
        <p className="text-green-600 font-medium">● Activo</p>
      </div>

      {/* Chip de especialidad */}
      {empleado.especialidad && (
        <div className="mb-4">
          <span className="inline-block bg-primary-light text-primary-dark px-3 py-1 rounded-full text-xs font-medium">
            {empleado.especialidad}
          </span>
        </div>
      )}

      {/* Eficiencia visual (placeholder) */}
      <div className="mb-2">
        <p className="text-sm text-foreground font-medium mb-1">Eficiencia</p>
        <div className="w-full h-2 bg-muted rounded-full">
          <div className="h-full bg-gradient-to-r from-primary to-pink-400 rounded-full w-[85%]" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">85%</p>
      </div>
    </div>
  );
};

export default TarjetaEmpleado;
