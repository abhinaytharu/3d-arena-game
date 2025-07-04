#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <cmath>
#include <vector>
#include <map>
#include <limits>

namespace py = pybind11;

// Vector3 structure for 3D coordinates
struct Vector3 {
    double x, y, z;
    
    Vector3(double x = 0.0, double y = 0.0, double z = 0.0) : x(x), y(y), z(z) {}
    
    // Calculate distance between two points
    double distance(const Vector3& other) const {
        double dx = x - other.x;
        double dy = y - other.y;
        double dz = z - other.z;
        return std::sqrt(dx*dx + dy*dy + dz*dz);
    }
    
    // Calculate squared distance (faster, avoids sqrt)
    double distanceSquared(const Vector3& other) const {
        double dx = x - other.x;
        double dy = y - other.y;
        double dz = z - other.z;
        return dx*dx + dy*dy + dz*dz;
    }
    
    // Vector operations
    Vector3 operator+(const Vector3& other) const {
        return Vector3(x + other.x, y + other.y, z + other.z);
    }
    
    Vector3 operator-(const Vector3& other) const {
        return Vector3(x - other.x, y - other.y, z - other.z);
    }
    
    Vector3 operator*(double scalar) const {
        return Vector3(x * scalar, y * scalar, z * scalar);
    }
    
    // Normalize vector
    Vector3 normalize() const {
        double length = std::sqrt(x*x + y*y + z*z);
        if (length > 0) {
            return Vector3(x/length, y/length, z/length);
        }
        return Vector3(0, 0, 0);
    }
    
    // Dot product
    double dot(const Vector3& other) const {
        return x*other.x + y*other.y + z*other.z;
    }
};

// Sphere structure
struct Sphere {
    Vector3 center;
    double radius;
    
    Sphere(const Vector3& center = Vector3(), double radius = 0.0) 
        : center(center), radius(radius) {}
};

// Ray structure for ray casting
struct Ray {
    Vector3 origin;
    Vector3 direction;
    
    Ray(const Vector3& origin = Vector3(), const Vector3& direction = Vector3()) 
        : origin(origin), direction(direction.normalize()) {}
};

// Check if two spheres intersect
bool spheres_intersect(const Sphere& sphere1, const Sphere& sphere2) {
    double distance = sphere1.center.distance(sphere2.center);
    double sum_radii = sphere1.radius + sphere2.radius;
    return distance <= sum_radii;
}

// Check if two spheres intersect (using coordinates and radii)
bool spheres_intersect_coords(double x1, double y1, double z1, double r1,
                             double x2, double y2, double z2, double r2) {
    Vector3 center1(x1, y1, z1);
    Vector3 center2(x2, y2, z2);
    Sphere sphere1(center1, r1);
    Sphere sphere2(center2, r2);
    return spheres_intersect(sphere1, sphere2);
}

// Ray-sphere intersection test
bool ray_sphere_intersect(const Ray& ray, const Sphere& sphere, double& t) {
    Vector3 oc = ray.origin - sphere.center;
    double a = ray.direction.dot(ray.direction);
    double b = 2.0 * oc.dot(ray.direction);
    double c = oc.dot(oc) - sphere.radius * sphere.radius;
    
    double discriminant = b*b - 4*a*c;
    
    if (discriminant < 0) {
        return false; // No intersection
    }
    
    double sqrt_disc = std::sqrt(discriminant);
    double t1 = (-b - sqrt_disc) / (2.0 * a);
    double t2 = (-b + sqrt_disc) / (2.0 * a);
    
    // Return the closest positive intersection
    if (t1 > 0) {
        t = t1;
        return true;
    } else if (t2 > 0) {
        t = t2;
        return true;
    }
    
    return false; // Intersection behind ray origin
}

// Check ray hit against multiple spheres (for player shooting)
py::dict check_ray_hit_spheres(const py::dict& ray_data, const py::dict& players) {
    // Extract ray data
    py::dict origin_dict = ray_data["origin"];
    py::dict direction_dict = ray_data["direction"];
    
    Vector3 origin(origin_dict["x"].cast<double>(), 
                   origin_dict["y"].cast<double>(), 
                   origin_dict["z"].cast<double>());
    
    Vector3 direction(direction_dict["x"].cast<double>(), 
                      direction_dict["y"].cast<double>(), 
                      direction_dict["z"].cast<double>());
    
    Ray ray(origin, direction);
    
    // Find closest hit
    double closest_t = std::numeric_limits<double>::infinity();
    std::string closest_player_id = "";
    Vector3 closest_hit_point;
    
    for (auto item : players) {
        std::string player_id = item.first.cast<std::string>();
        py::dict player_data = item.second.cast<py::dict>();
        
        // Skip if player has no position data
        if (!player_data.contains("x") || !player_data.contains("y") || !player_data.contains("z")) {
            continue;
        }
        
        Vector3 player_pos(player_data["x"].cast<double>(),
                          player_data["y"].cast<double>(),
                          player_data["z"].cast<double>());
        
        // Treat player as sphere with radius 0.5
        Sphere player_sphere(player_pos, 0.5);
        
        double t;
        if (ray_sphere_intersect(ray, player_sphere, t)) {
            if (t < closest_t) {
                closest_t = t;
                closest_player_id = player_id;
                closest_hit_point = ray.origin + ray.direction * t;
            }
        }
    }
    
    // Return result
    py::dict result;
    if (closest_player_id != "") {
        result["hit"] = true;
        result["target_id"] = closest_player_id;
        result["distance"] = closest_t;
        result["hit_position"] = py::dict();
        result["hit_position"]["x"] = closest_hit_point.x;
        result["hit_position"]["y"] = closest_hit_point.y;
        result["hit_position"]["z"] = closest_hit_point.z;
        result["damage"] = 25;
    } else {
        result["hit"] = false;
    }
    
    return result;
}

// Simple addition function (keeping for compatibility)
int add(int a, int b) {
    return a + b;
}

PYBIND11_MODULE(cpp_logic, m) {
    m.doc() = "C++ game logic module with sphere intersection and ray casting";
    
    // Basic function
    m.def("add", &add, "A function which adds two numbers");
    
    // Sphere intersection functions
    m.def("spheres_intersect", &spheres_intersect, 
          "Check if two spheres intersect", 
          py::arg("sphere1"), py::arg("sphere2"));
    
    m.def("spheres_intersect_coords", &spheres_intersect_coords,
          "Check if two spheres intersect using coordinates",
          py::arg("x1"), py::arg("y1"), py::arg("z1"), py::arg("r1"),
          py::arg("x2"), py::arg("y2"), py::arg("z2"), py::arg("r2"));
    
    m.def("ray_sphere_intersect", &ray_sphere_intersect,
          "Check if a ray intersects with a sphere",
          py::arg("ray"), py::arg("sphere"), py::arg("t"));
    
    m.def("check_ray_hit_spheres", &check_ray_hit_spheres,
          "Check ray hit against multiple spheres (for player shooting)",
          py::arg("ray_data"), py::arg("players"));
    
    // Class definitions
    py::class_<Vector3>(m, "Vector3")
        .def(py::init<double, double, double>(), py::arg("x") = 0.0, py::arg("y") = 0.0, py::arg("z") = 0.0)
        .def_readwrite("x", &Vector3::x)
        .def_readwrite("y", &Vector3::y)
        .def_readwrite("z", &Vector3::z)
        .def("distance", &Vector3::distance)
        .def("distance_squared", &Vector3::distanceSquared)
        .def("normalize", &Vector3::normalize)
        .def("dot", &Vector3::dot)
        .def("__add__", &Vector3::operator+)
        .def("__sub__", &Vector3::operator-)
        .def("__mul__", &Vector3::operator*);

    py::class_<Sphere>(m, "Sphere")
        .def(py::init<Vector3, double>(), py::arg("center") = Vector3(), py::arg("radius") = 0.0)
        .def_readwrite("center", &Sphere::center)
        .def_readwrite("radius", &Sphere::radius);

    py::class_<Ray>(m, "Ray")
        .def(py::init<Vector3, Vector3>(), py::arg("origin") = Vector3(), py::arg("direction") = Vector3())
        .def_readwrite("origin", &Ray::origin)
        .def_readwrite("direction", &Ray::direction);
}
