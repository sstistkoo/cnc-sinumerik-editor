import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const CNCPathVisualization = ({ programCode }) => {
  const [pathData, setPathData] = useState([]);
  
  useEffect(() => {
    const processProgram = () => {
      const data = [];
      let currentX = 0;
      let currentZ = 0;
      let index = 0;

      const lines = programCode.split('\n');
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith(';')) return;

        const xMatch = trimmedLine.match(/X([-\d.]+)/);
        const zMatch = trimmedLine.match(/Z([-\d.]+)/);
        
        if (xMatch || zMatch) {
          if (xMatch) currentX = parseFloat(xMatch[1]);
          if (zMatch) currentZ = parseFloat(zMatch[1]);
          
          const command = trimmedLine.includes('G0') ? 'G0' : 
                         trimmedLine.includes('G1') ? 'G1' : 
                         trimmedLine.includes('G2') ? 'G2' : 
                         trimmedLine.includes('G3') ? 'G3' : 'Unknown';
          
          data.push({
            index: index++,
            x: currentX,
            z: currentZ,
            command: command
          });
        }
      });

      setPathData(data);
    };

    if (programCode) {
      processProgram();
    }
  }, [programCode]);

  return (
    <div className="cnc-visualization">
      <h3>2D Vizualizace drah</h3>
      <div className="chart-container">
        <LineChart
          width={600}
          height={400}
          data={pathData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="z" 
            label={{ value: 'Osa Z (mm)', position: 'bottom' }}
            domain={['auto', 'auto']}
          />
          <YAxis 
            dataKey="x"
            label={{ value: 'Osa X (mm)', angle: -90, position: 'left' }}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            formatter={(value, name, props) => [
              `${value.toFixed(3)} mm`,
              name === 'x' ? 'Osa X' : 'Osa Z'
            ]}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="x" 
            stroke="#2196f3" 
            dot={{ r: 3 }} 
            name="Osa X"
            connectNulls
          />
          <Line 
            type="monotone" 
            dataKey="z" 
            stroke="#f50057" 
            dot={{ r: 3 }} 
            name="Osa Z"
            connectNulls
          />
        </LineChart>
      </div>
    </div>
  );
};

export default CNCPathVisualization;
