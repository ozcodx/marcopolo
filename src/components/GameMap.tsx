import { useEffect, useState, useRef } from 'react';
import Globe from 'react-globe.gl';
import { Country, calculateDistance, countries } from '../data/countries';

// Función para normalizar texto (eliminar acentos y convertir a minúsculas)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// Función para obtener la URL de la bandera
const getFlagUrl = (countryCode: string): string => {
  return `https://flagcdn.com/16x12/${countryCode.toLowerCase()}.png`;
};

interface Guess {
  country: Country;
  distance: number;
}

interface GameMapProps {
  targetCountry: Country;
  guesses: Guess[];
  addGuess: (guess: Guess) => void;
}

const GameMap = ({ targetCountry, guesses, addGuess }: GameMapProps) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Country[]>([]);
  const [error, setError] = useState('');
  const globeRef = useRef<any>();
  const [globeWidth, setGlobeWidth] = useState(400);
  const [globeHeight, setGlobeHeight] = useState(400);
  const [userInteracted, setUserInteracted] = useState(false);
  const globeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputValue.length > 1) {
      const normalizedInput = normalizeText(inputValue);
      const filteredCountries = countries.filter(country => 
        normalizeText(country.name).includes(normalizedInput)
      );
      setSuggestions(filteredCountries);
    } else {
      setSuggestions([]);
    }
  }, [inputValue]);

  // Efecto para inicializar el globo
  useEffect(() => {
    if (globeRef.current) {
      // Configurar la rotación automática
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      
      // Configurar la cámara para una mejor visualización
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);

      // Añadir evento para detectar interacción del usuario
      const controls = globeRef.current.controls();
      controls.addEventListener('start', handleUserInteraction);
    }

    return () => {
      if (globeRef.current) {
        const controls = globeRef.current.controls();
        controls.removeEventListener('start', handleUserInteraction);
      }
    };
  }, []);

  // Función para manejar la interacción del usuario
  const handleUserInteraction = () => {
    if (!userInteracted && globeRef.current) {
      setUserInteracted(true);
      globeRef.current.controls().autoRotate = false;
    }
  };

  // Efecto para ajustar el tamaño del globo cuando cambia el tamaño de la ventana
  useEffect(() => {
    const updateGlobeSize = () => {
      if (globeContainerRef.current) {
        const containerWidth = globeContainerRef.current.clientWidth;
        // Asegurar que el globo no sea más grande que su contenedor
        const size = Math.min(containerWidth, window.innerHeight * 0.5);
        setGlobeWidth(size);
        setGlobeHeight(size);
      }
    };

    updateGlobeSize(); // Ajustar tamaño inicial
    
    const handleResize = () => {
      updateGlobeSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleGuess = (country: Country) => {
    // Verificar si ya se ha adivinado este país
    if (guesses.some(guess => normalizeText(guess.country.name) === normalizeText(country.name))) {
      setError('¡Ya has intentado con este país!');
      return;
    }

    const distance = calculateDistance(
      country.latitude, 
      country.longitude, 
      targetCountry.latitude, 
      targetCountry.longitude
    );

    addGuess({ country, distance });
    setInputValue('');
    setSuggestions([]);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setError('');
  };

  const getDistanceColor = (distance: number) => {
    if (distance < 500) return 'green';
    if (distance < 1500) return 'yellow';
    if (distance < 3000) return 'orange';
    return 'red';
  };

  // Preparar los marcadores para el globo
  const markerData = guesses.map(guess => ({
    lat: guess.country.latitude,
    lng: guess.country.longitude,
    color: getDistanceColor(guess.distance),
    name: guess.country.name,
    distance: guess.distance
  }));

  return (
    <div className="game-map-container">
      <div className="globe-and-input">
        <div className="input-container">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Escribe el nombre de un país..."
            className="country-input"
          />
          {error && <p className="error-message">{error}</p>}
          {suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map(country => (
                <li 
                  key={country.name} 
                  onClick={() => handleGuess(country)}
                  className="suggestion-item"
                >
                  <img 
                    src={getFlagUrl(country.code)} 
                    alt={`Bandera de ${country.name}`}
                    className="country-flag"
                    onError={(e) => {
                      // Si la imagen falla, usar una imagen de respaldo
                      (e.target as HTMLImageElement).src = 'https://flagcdn.com/16x12/xx.png';
                    }}
                  />
                  <span className="country-name">{country.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="globe-container" ref={globeContainerRef}>
          <Globe
            ref={globeRef}
            globeImageUrl="/earth-sepia.jpg"
            backgroundColor="#00000000"
            pointsData={markerData}
            pointColor="color"
            pointAltitude={0.1}
            pointRadius={0.5}
            pointLabel={(d: any) => `${d.name}: ${d.distance} km`}
            width={globeWidth}
            height={globeHeight}
            atmosphereColor="rgba(139, 69, 19, 0.2)"
            showAtmosphere={true}
          />
        </div>
      </div>
      
      <div className="guesses-container">
        <h3>Intentos</h3>
        {guesses.length === 0 ? (
          <p>Aún no has realizado ningún intento.</p>
        ) : (
          <ul className="guesses-list">
            {[...guesses]
              .sort((a, b) => a.distance - b.distance) // Ordenar por distancia (menor a mayor)
              .map((guess, index) => (
              <li 
                key={index} 
                className="guess-item"
                style={{ borderLeft: `4px solid ${getDistanceColor(guess.distance)}` }}
              >
                <div className="guess-line">
                  <div className="guess-country-info">
                    <img 
                      src={getFlagUrl(guess.country.code)} 
                      alt={`Bandera de ${guess.country.name}`}
                      className="country-flag"
                      onError={(e) => {
                        // Si la imagen falla, usar una imagen de respaldo
                        (e.target as HTMLImageElement).src = 'https://flagcdn.com/16x12/xx.png';
                      }}
                    />
                    <span className="country-name">{guess.country.name}</span>
                    <span className="country-capital">({guess.country.capital})</span>
                  </div>
                  <div className="guess-distance" style={{ 
                    color: getDistanceColor(guess.distance) === 'green' ? 'green' : 
                           getDistanceColor(guess.distance) === 'yellow' ? '#b0b000' : 
                           getDistanceColor(guess.distance) === 'orange' ? 'orange' : 'red'
                  }}>
                    {guess.distance} km
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default GameMap; 