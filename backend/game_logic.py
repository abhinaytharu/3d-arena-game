# game_logic.py
# Game logic and C++ bindings for 3D Arena Shooter

import math
from typing import Dict, Any, Optional

try:
    import cpp_logic
    CPP_AVAILABLE = True
    print("C++ game logic module loaded successfully")
except ImportError as e:
    cpp_logic = None
    CPP_AVAILABLE = False
    print(f"C++ game logic module not available: {e}")

def add(a: int, b: int) -> int:
    """Add two numbers using C++ if available, otherwise Python"""
    if CPP_AVAILABLE:
        return cpp_logic.add(a, b)
    return a + b

def spheres_intersect_coords(x1: float, y1: float, z1: float, r1: float,
                           x2: float, y2: float, z2: float, r2: float) -> bool:
    """Check if two spheres intersect using coordinates"""
    if CPP_AVAILABLE:
        return cpp_logic.spheres_intersect_coords(x1, y1, z1, r1, x2, y2, z2, r2)
    
    # Python fallback implementation
    distance = math.sqrt((x2 - x1)**2 + (y2 - y1)**2 + (z2 - z1)**2)
    return distance <= (r1 + r2)

def spheres_intersect(sphere1: Any, sphere2: Any) -> bool:
    """Check if two sphere objects intersect"""
    if CPP_AVAILABLE and hasattr(cpp_logic, 'Sphere'):
        return cpp_logic.spheres_intersect(sphere1, sphere2)
    
    # Python fallback implementation
    if hasattr(sphere1, 'center') and hasattr(sphere2, 'center'):
        distance = math.sqrt(
            (sphere2.center.x - sphere1.center.x)**2 +
            (sphere2.center.y - sphere1.center.y)**2 +
            (sphere2.center.z - sphere1.center.z)**2
        )
        return distance <= (sphere1.radius + sphere2.radius)
    
    return False

def ray_sphere_intersect(ray: Any, sphere: Any) -> Optional[float]:
    """Check if a ray intersects with a sphere, returns intersection distance or None"""
    if CPP_AVAILABLE and hasattr(cpp_logic, 'Ray') and hasattr(cpp_logic, 'Sphere'):
        t = 0.0
        if cpp_logic.ray_sphere_intersect(ray, sphere, t):
            return t
        return None
    
    # Python fallback implementation
    if hasattr(ray, 'origin') and hasattr(ray, 'direction') and hasattr(sphere, 'center'):
        oc_x = ray.origin.x - sphere.center.x
        oc_y = ray.origin.y - sphere.center.y
        oc_z = ray.origin.z - sphere.center.z
        
        a = (ray.direction.x**2 + ray.direction.y**2 + ray.direction.z**2)
        b = 2.0 * (oc_x * ray.direction.x + oc_y * ray.direction.y + oc_z * ray.direction.z)
        c = (oc_x**2 + oc_y**2 + oc_z**2) - sphere.radius**2
        
        discriminant = b**2 - 4*a*c
        
        if discriminant < 0:
            return None
        
        sqrt_disc = math.sqrt(discriminant)
        t1 = (-b - sqrt_disc) / (2.0 * a)
        t2 = (-b + sqrt_disc) / (2.0 * a)
        
        if t1 > 0:
            return t1
        elif t2 > 0:
            return t2
    
    return None

def check_ray_hit(ray_data: Dict[str, Any], players: Dict[str, Any]) -> Dict[str, Any]:
    """Check if a ray hits any players, using C++ if available"""
    if CPP_AVAILABLE:
        try:
            return cpp_logic.check_ray_hit_spheres(ray_data, players)
        except Exception as e:
            print(f"Error in C++ ray hit detection: {e}")
            # Fall back to Python implementation
    
    # Python fallback implementation
    return python_check_ray_hit(ray_data, players)

def python_check_ray_hit(ray_data: Dict[str, Any], players: Dict[str, Any]) -> Dict[str, Any]:
    """Python implementation of ray hit detection"""
    origin = ray_data.get('origin', {})
    direction = ray_data.get('direction', {})
    
    if not all(key in origin for key in ['x', 'y', 'z']):
        return {'hit': False}
    if not all(key in direction for key in ['x', 'y', 'z']):
        return {'hit': False}
    
    # Normalize direction
    dir_length = math.sqrt(direction['x']**2 + direction['y']**2 + direction['z']**2)
    if dir_length == 0:
        return {'hit': False}
    
    dir_x = direction['x'] / dir_length
    dir_y = direction['y'] / dir_length
    dir_z = direction['z'] / dir_length
    
    closest_t = float('inf')
    closest_player_id = None
    closest_hit_point = None
    
    for player_id, player_data in players.items():
        if not isinstance(player_data, dict):
            continue
            
        if not all(key in player_data for key in ['x', 'y', 'z']):
            continue
        
        # Treat player as sphere with radius 0.5
        player_x = player_data['x']
        player_y = player_data['y']
        player_z = player_data['z']
        player_radius = 0.5
        
        # Ray-sphere intersection test
        oc_x = origin['x'] - player_x
        oc_y = origin['y'] - player_y
        oc_z = origin['z'] - player_z
        
        a = dir_x**2 + dir_y**2 + dir_z**2
        b = 2.0 * (oc_x * dir_x + oc_y * dir_y + oc_z * dir_z)
        c = oc_x**2 + oc_y**2 + oc_z**2 - player_radius**2
        
        discriminant = b**2 - 4*a*c
        
        if discriminant >= 0:
            sqrt_disc = math.sqrt(discriminant)
            t1 = (-b - sqrt_disc) / (2.0 * a)
            t2 = (-b + sqrt_disc) / (2.0 * a)
            
            t = None
            if t1 > 0:
                t = t1
            elif t2 > 0:
                t = t2
            
            if t is not None and t < closest_t:
                closest_t = t
                closest_player_id = player_id
                closest_hit_point = {
                    'x': origin['x'] + dir_x * t,
                    'y': origin['y'] + dir_y * t,
                    'z': origin['z'] + dir_z * t
                }
    
    if closest_player_id is not None:
        return {
            'hit': True,
            'target_id': closest_player_id,
            'distance': closest_t,
            'hit_position': closest_hit_point,
            'damage': 25
        }
    else:
        return {'hit': False}

def create_vector3(x: float = 0.0, y: float = 0.0, z: float = 0.0) -> Any:
    """Create a Vector3 object"""
    if CPP_AVAILABLE and hasattr(cpp_logic, 'Vector3'):
        return cpp_logic.Vector3(x, y, z)
    
    # Python fallback - simple dict
    return {'x': x, 'y': y, 'z': z}

def create_sphere(center: Any, radius: float = 0.0) -> Any:
    """Create a Sphere object"""
    if CPP_AVAILABLE and hasattr(cpp_logic, 'Sphere'):
        return cpp_logic.Sphere(center, radius)
    
    # Python fallback - simple dict
    return {'center': center, 'radius': radius}

def create_ray(origin: Any, direction: Any) -> Any:
    """Create a Ray object"""
    if CPP_AVAILABLE and hasattr(cpp_logic, 'Ray'):
        return cpp_logic.Ray(origin, direction)
    
    # Python fallback - simple dict
    return {'origin': origin, 'direction': direction}

# Test functions
def test_sphere_intersection():
    """Test sphere intersection functionality"""
    print("Testing sphere intersection...")
    
    # Test with coordinates
    result1 = spheres_intersect_coords(0, 0, 0, 1, 2, 0, 0, 1)  # Should not intersect
    result2 = spheres_intersect_coords(0, 0, 0, 1, 1, 0, 0, 1)  # Should intersect
    
    print(f"Spheres at (0,0,0) r=1 and (2,0,0) r=1 intersect: {result1}")
    print(f"Spheres at (0,0,0) r=1 and (1,0,0) r=1 intersect: {result2}")
    
    return result1 == False and result2 == True

def test_ray_hit_detection():
    """Test ray hit detection functionality"""
    print("Testing ray hit detection...")
    
    ray_data = {
        'origin': {'x': 0, 'y': 0, 'z': 0},
        'direction': {'x': 1, 'y': 0, 'z': 0}
    }
    
    players = {
        'player1': {'x': 5, 'y': 0, 'z': 0, 'health': 100},
        'player2': {'x': 10, 'y': 0, 'z': 0, 'health': 100}
    }
    
    result = check_ray_hit(ray_data, players)
    print(f"Ray hit result: {result}")
    
    return result.get('hit', False) and result.get('target_id') == 'player1'

if __name__ == "__main__":
    print("Running game logic tests...")
    test_sphere_intersection()
    test_ray_hit_detection()
    print("Tests completed!") 